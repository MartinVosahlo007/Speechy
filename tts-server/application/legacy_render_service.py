import asyncio
import contextlib
import json
import os
import uuid
from pathlib import Path
from time import time
from typing import TYPE_CHECKING, Any

from application.runtime_invocation import prepare_runtime_voice, render_runtime_block
from domain.text_chunking import split_text_into_chunks
from domain.types import Job
from application.contracts import InferenceOptions

if TYPE_CHECKING:
    from application.task_registry import TaskRegistry
    from application.provider_registry import ProviderRegistry


class LegacyRenderService:
    def __init__(
        self,
        *,
        runtime_registry: "ProviderRegistry",
        storage_dir: Path,
        task_registry: "TaskRegistry",
        max_active_jobs: int,
        ttl_seconds: int,
    ):
        self.runtime_registry = runtime_registry
        self.storage_dir = storage_dir
        self.task_registry = task_registry
        self.max_active_jobs = max_active_jobs
        self.ttl_seconds = ttl_seconds
        self.jobs: dict[str, Job] = {}

    def create_job(self, text: str, options: Any) -> str:
        self.cleanup_expired_jobs()
        payload = options.model_dump()
        runtime = self.runtime_registry.get_runtime(payload.get("provider"))
        blocks = split_text_into_chunks(text, max_chars=runtime.long_form_chunk_chars)
        if not blocks:
            raise ValueError("Text is empty")
        if self._active_job_count() >= self.max_active_jobs:
            raise ValueError("Too many active render jobs. Please wait for the current jobs to finish.")

        job_id = str(uuid.uuid4())
        self.jobs[job_id] = {
            "id": job_id,
            "status": "queued",
            "provider": payload.get("provider", getattr(runtime, "provider_id", "omnivoice")),
            "text": text,
            "voice": payload["voice"],
            "language": payload.get("language", "cs"),
            "speed": payload.get("speed", 1.0),
            "total_blocks": len(blocks),
            "completed_blocks": 0,
            "timeline": [],
            "final_audio_path": None,
            "error": None,
            "created_at": time(),
            "finished_at": None,
            "blocks": [
                {
                    "index": index,
                    "text": block_text,
                    "status": "queued",
                    "error": None,
                    "audio_path": None,
                    "start_ms": None,
                    "end_ms": None,
                }
                for index, block_text in enumerate(blocks)
            ],
        }
        self.task_registry.start_legacy_job(job_id, self._run_job(job_id, payload))
        return job_id

    async def _run_job(self, job_id: str, payload: dict[str, Any]):
        job = self.jobs.get(job_id)
        if not job:
            return

        async with self.task_registry.semaphore:
            job["status"] = "running"
            options = self._build_inference_options(payload)
            runtime = self.runtime_registry.get_runtime(job.get("provider"))
            loop = asyncio.get_event_loop()
            try:
                prepared_voice = await loop.run_in_executor(
                    None,
                    prepare_runtime_voice,
                    runtime,
                    options.voice,
                    options,
                )
            except Exception as exc:
                # #region agent log
                try:
                    import numpy as _np

                    _debug_payload = {
                        "sessionId": "aa5a17",
                        "runId": "post-fix",
                        "hypothesisId": "H1-numpy-abi",
                        "location": "legacy_render_service.py:voice_prompt",
                        "message": "voice prompt creation failed",
                        "data": {
                            "error": repr(exc),
                            "numpy": getattr(_np, "__version__", None),
                            "pandas": __import__("pandas").__version__,
                            "sklearn": __import__("sklearn").__version__,
                        },
                        "timestamp": int(time() * 1000),
                    }
                    _log_path = Path(__file__).resolve().parents[2] / "debug-aa5a17.log"
                    with _log_path.open("a", encoding="utf-8") as _log_file:
                        _log_file.write(json.dumps(_debug_payload, ensure_ascii=False) + "\n")
                except Exception:
                    pass
                # #endregion
                job["status"] = "error"
                job["error"] = f"Voice prompt creation failed: {repr(exc)}"
                job["finished_at"] = time()
                return
            rendered_blocks: list[dict[str, Any]] = []

            for block in job["blocks"]:
                block["status"] = "running"
                try:
                    waveform, sample_rate = await loop.run_in_executor(
                        None,
                        render_runtime_block,
                        runtime,
                        block["text"],
                        options,
                        prepared_voice,
                    )
                    audio_path = self._write_block_audio(job_id, block["index"], waveform, sample_rate, runtime)
                    block["audio_path"] = str(audio_path)
                    block["status"] = "done"
                    start_ms = job["timeline"][-1]["end_ms"] if job["timeline"] else 0
                    duration_ms = int(round((len(waveform) / sample_rate) * 1000))
                    block["start_ms"] = start_ms
                    block["end_ms"] = start_ms + duration_ms
                    job["timeline"].append(
                        {
                            "index": block["index"],
                            "text": block["text"],
                            "start_ms": block["start_ms"],
                            "end_ms": block["end_ms"],
                        }
                    )
                    job["completed_blocks"] += 1
                    rendered_blocks.append(
                        {
                            "index": block["index"],
                            "text": block["text"],
                            "waveform": waveform,
                            "sample_rate": sample_rate,
                        }
                    )
                except Exception as exc:
                    block["status"] = "error"
                    block["error"] = repr(exc)
                    job["status"] = "error"
                    job["error"] = f"Block {block['index']} failed: {repr(exc)}"
                    job["finished_at"] = time()
                    return

            try:
                final_waveform, sample_rate, timeline = await loop.run_in_executor(
                    None,
                    runtime.concatenate_rendered_blocks,
                    rendered_blocks,
                )
                audio_bytes = await loop.run_in_executor(
                    None,
                    runtime.write_final_wav,
                    final_waveform,
                    sample_rate,
                )
            except Exception as exc:
                job["status"] = "error"
                job["error"] = f"Final audio assembly failed: {repr(exc)}"
                job["finished_at"] = time()
                return

            final_audio_path = self._write_final_audio(job_id, audio_bytes)
            job["timeline"] = timeline
            job["final_audio_path"] = str(final_audio_path)
            job["status"] = "done"
            job["finished_at"] = time()

    def get_job(self, job_id: str):
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(job_id)
        return {
            "id": job["id"],
            "status": job["status"],
            "provider": job["provider"],
            "voice": job["voice"],
            "text": job["text"],
            "total_blocks": job["total_blocks"],
            "completed_blocks": job["completed_blocks"],
            "timeline": list(job["timeline"]),
            "blocks": [
                {
                    "index": block["index"],
                    "text": block["text"],
                    "status": block["status"],
                    "error": block["error"],
                    "audio_path": block["audio_path"],
                    "start_ms": block.get("start_ms"),
                    "end_ms": block.get("end_ms"),
                }
                for block in job["blocks"]
            ],
            "final_audio_path": job["final_audio_path"],
            "error": job["error"],
            "created_at": job["created_at"],
            "finished_at": job["finished_at"],
        }

    def get_final_audio(self, job_id: str) -> bytes:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(job_id)
        if job["status"] != "done" or not job["final_audio_path"]:
            raise ValueError(job["status"])
        runtime = self.runtime_registry.get_runtime(job.get("provider"))
        return runtime.read_final_wav(Path(job["final_audio_path"]))

    def get_block_audio(self, job_id: str, block_index: int) -> bytes:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(job_id)
        try:
            block = job["blocks"][block_index]
        except IndexError as exc:
            raise KeyError(block_index) from exc
        if block["status"] != "done" or not block["audio_path"]:
            raise ValueError(block["status"])
        runtime = self.runtime_registry.get_runtime(job.get("provider"))
        return runtime.read_final_wav(Path(block["audio_path"]))

    async def wait_for_job(self, job_id: str):
        await self.task_registry.wait_for_legacy_job(job_id)

    def cleanup_expired_jobs(self, force: bool = False):
        now = time()
        expired_ids = [
            job_id
            for job_id, job in self.jobs.items()
            if force or (job["finished_at"] is not None and now - job["finished_at"] >= self.ttl_seconds)
        ]
        for job_id in expired_ids:
            self._delete_job_files(job_id, self.jobs[job_id])
            self.jobs.pop(job_id, None)
            self.task_registry.remove_legacy_job(job_id)

    def _active_job_count(self) -> int:
        return self.task_registry.active_job_count(self.jobs)

    def _write_block_audio(self, job_id: str, block_index: int, waveform, sample_rate: int, runtime) -> Path:
        job_dir = self.storage_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        target = job_dir / f"block-{block_index}.wav"
        target.write_bytes(runtime.write_final_wav(waveform, sample_rate))
        return target

    def _write_final_audio(self, job_id: str, audio: bytes) -> Path:
        job_dir = self.storage_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        target = job_dir / "final.wav"
        target.write_bytes(audio)
        return target

    def _delete_job_files(self, job_id: str, job: Job):
        for block in job["blocks"]:
            audio_path = block.get("audio_path")
            if audio_path and os.path.exists(audio_path):
                with contextlib.suppress(OSError):
                    os.remove(audio_path)
        final_audio_path = job.get("final_audio_path")
        if final_audio_path and os.path.exists(final_audio_path):
            with contextlib.suppress(OSError):
                os.remove(final_audio_path)
        job_dir = self.storage_dir / job_id
        if job_dir.exists():
            with contextlib.suppress(OSError):
                job_dir.rmdir()

    def _build_inference_options(self, payload: dict[str, Any]):
        return InferenceOptions(**payload)

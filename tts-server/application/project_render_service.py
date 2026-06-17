import asyncio
import json
import time
import traceback
import uuid
from pathlib import Path
from typing import Any

from application.contracts import InferenceOptions
from application.runtime_invocation import prepare_runtime_voice, render_runtime_block

# #region agent log
_DEBUG_LOG_PATH = Path(__file__).resolve().parents[2] / "debug-26eaee.log"


def _agent_log(location: str, message: str, data: dict[str, Any], hypothesis_id: str) -> None:
    try:
        payload = {
            "sessionId": "26eaee",
            "location": location,
            "message": message,
            "data": data,
            "hypothesisId": hypothesis_id,
            "timestamp": int(time.time() * 1000),
        }
        with _DEBUG_LOG_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass


# #endregion


class ProjectRenderService:
    def __init__(self, *, runtime_registry, project_store, task_registry, audio_assembler, storage_dir: Path):
        self.runtime_registry = runtime_registry
        self.project_store = project_store
        self.task_registry = task_registry
        self.audio_assembler = audio_assembler
        self.storage_dir = storage_dir

    def render_project(self, project_id: str):
        active_task = self.task_registry.project_task(project_id)
        if active_task and not active_task.done():
            return self.task_registry.project_job_id(project_id)

        project = self.project_store.get_project(project_id)
        if all(block["status"] == "done" for block in project["blocks"]):
            if not project["final_audio_path"]:
                self.audio_assembler.assemble_project_audio(project_id)
            return None

        job_id = str(uuid.uuid4())
        self.task_registry.start_project_job(project_id, job_id, self._run_project(project_id))
        return job_id

    async def wait_for_project(self, project_id: str):
        await self.task_registry.wait_for_project(project_id)

    async def _run_project(self, project_id: str):
        async with self.task_registry.semaphore:
            project = self.project_store.get_project(project_id)
            runtime = self.runtime_registry.get_runtime(project.get("selected_provider"))
            settings = project["settings"]
            prepared_voice_cache: dict[str, Any] = {}
            loop = asyncio.get_event_loop()

            for block in project["blocks"]:
                if block["status"] == "done":
                    continue
                current_step = "prompt"
                try:
                    voice_is_new = block["voice"] not in prepared_voice_cache
                    # #region agent log
                    _agent_log(
                        "project_render_service.py:_run_project",
                        "block render starting",
                        {
                            "projectId": project_id,
                            "blockIndex": block["index"],
                            "voice": block["voice"],
                            "voiceIsNew": voice_is_new,
                            "provider": project.get("selected_provider"),
                            "textLength": len(block["text"]),
                        },
                        "FACT-B1",
                    )
                    # #endregion
                    if voice_is_new:
                        prepared_voice_cache[block["voice"]] = await loop.run_in_executor(
                            None,
                            prepare_runtime_voice,
                            runtime,
                            block["voice"],
                            self._build_inference_options(
                                {
                                    "provider": project.get("selected_provider", "omnivoice"),
                                    "voice": block["voice"],
                                    "language": project["language"],
                                    "speed": settings.get("speed", 1.0),
                                }
                            ),
                        )

                    current_step = "render"
                    waveform, sample_rate = await loop.run_in_executor(
                        None,
                        render_runtime_block,
                        runtime,
                        block["text"],
                        self._build_inference_options(
                            {
                                "provider": project.get("selected_provider", "omnivoice"),
                                "voice": block["voice"],
                                "language": project["language"],
                                "speed": settings.get("speed", 1.0),
                            }
                        ),
                        prepared_voice_cache[block["voice"]],
                    )
                    duration_ms = int(round((len(waveform) / sample_rate) * 1000))
                    current_step = "write-wav"
                    audio_bytes = await loop.run_in_executor(
                        None,
                        runtime.write_final_wav,
                        waveform,
                        sample_rate,
                    )
                    current_step = "save-block-audio"
                    audio_path = self.project_store.save_project_block_audio(
                        project_id=project_id,
                        block_index=block["index"],
                        voice=block["voice"],
                        text=block["text"],
                        audio_bytes=audio_bytes,
                    )
                    current_step = "update-block"
                    self.project_store.update_project_block(
                        project_id,
                        block["index"],
                        status="done",
                        audio_path=audio_path,
                        duration_ms=duration_ms,
                        sample_rate=sample_rate,
                        error=None,
                    )
                    # #region agent log
                    _agent_log(
                        "project_render_service.py:_run_project",
                        "block render done",
                        {
                            "projectId": project_id,
                            "blockIndex": block["index"],
                            "voice": block["voice"],
                            "durationMs": duration_ms,
                        },
                        "FACT-B2",
                    )
                    # #endregion
                except Exception as exc:
                    error_message = f"{current_step}: {repr(exc)}"
                    error_trace = traceback.format_exc()
                    # #region agent log
                    _agent_log(
                        "project_render_service.py:_run_project",
                        "project block render failed",
                        {
                            "provider": project.get("selected_provider"),
                            "step": current_step,
                            "blockIndex": block["index"],
                            "textPreview": block["text"][:120],
                            "unusualChars": sorted(
                                {char for char in block["text"] if ord(char) > 127 or char in "„‚«»"}
                            ),
                            "error": repr(exc),
                        },
                        "B",
                    )
                    # #endregion
                    self._log_project_render_error(
                        project_id=project_id,
                        block_index=block["index"],
                        step=current_step,
                        error_trace=error_trace,
                    )
                    self.project_store.update_project_block(
                        project_id,
                        block["index"],
                        status="error",
                        audio_path=None,
                        duration_ms=None,
                        sample_rate=None,
                        error=error_message,
                    )
                    return

            self.audio_assembler.assemble_project_audio(project_id)

    def _build_inference_options(self, payload: dict[str, Any]):
        return InferenceOptions(**payload)

    def _log_project_render_error(
        self,
        *,
        project_id: str,
        block_index: int,
        step: str,
        error_trace: str,
    ):
        target = self.storage_dir / "project-render-errors.log"
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("a", encoding="utf-8") as handle:
            handle.write(
                f"[project={project_id} block={block_index} step={step}]\n{error_trace}\n"
            )

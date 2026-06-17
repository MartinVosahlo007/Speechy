import io
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from application.job_service import JobService
from presentation.dependencies import create_jobs, parse_inference_options
from presentation.http_models import ProjectCreateRequest, ProjectSyncRequest, ProjectUpdateRequest, RenderRequest
from presentation.provider_helpers import build_health_payload, build_voice_payload, ensure_runtime_registry, import_provider_voice
from presentation.serializers import serialize_project, serialize_render_status

if TYPE_CHECKING:
    from application.provider_registry import ProviderRegistry

def create_app(runtime_registry: "ProviderRegistry | None" = None, jobs: JobService | None = None, runtime=None):
    runtime_registry_instance = runtime_registry
    jobs_instance = jobs

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        nonlocal runtime_registry_instance, jobs_instance
        runtime_registry_instance = ensure_runtime_registry(runtime_registry_instance, runtime)
        jobs_instance = jobs_instance or create_jobs(runtime_registry_instance)
        app.state.runtime_registry = runtime_registry_instance
        app.state.jobs = jobs_instance
        try:
            yield
        finally:
            if hasattr(jobs_instance, "shutdown"):
                await jobs_instance.shutdown()

    app = FastAPI(title="Czech OmniVoice API", version="3.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def get_runtime_registry():
        return app.state.runtime_registry if hasattr(app.state, "runtime_registry") else ensure_runtime_registry(runtime_registry_instance, runtime)

    def get_jobs():
        return app.state.jobs if hasattr(app.state, "jobs") else jobs_instance

    @app.get("/api/health")
    async def health():
        return build_health_payload(get_runtime_registry())

    @app.get("/api/voices")
    async def get_voices(provider: str | None = None):
        return build_voice_payload(get_runtime_registry(), provider)

    @app.post("/api/voices")
    async def upload_voice(file: UploadFile = File(...)):
        registry = get_runtime_registry()
        runtime = registry.get_runtime("omnivoice")
        filename = Path(file.filename or "").name
        if not filename.lower().endswith(".wav"):
            raise HTTPException(status_code=400, detail="Only WAV voice files are supported.")
        content = await file.read()
        if len(content) < 1024:
            raise HTTPException(status_code=400, detail="Uploaded WAV file is too small.")
        saved = import_provider_voice(registry, "omnivoice", filename, content)
        return {"voice": saved}

    @app.post("/api/providers/supertonic/styles")
    async def import_supertonic_style(file: UploadFile = File(...)):
        registry = get_runtime_registry()
        try:
            runtime = registry.get_runtime("supertonic")
        except KeyError:
            raise HTTPException(status_code=503, detail="Provider 'supertonic' is not available.")
        filename = Path(file.filename or "").name
        content = await file.read()
        voice = import_provider_voice(registry, "supertonic", filename, content)
        return {"voice": voice}

    @app.post("/api/render")
    async def start_render(req: RenderRequest):
        jobs = get_jobs()
        if not req.text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")
        try:
            job_id = jobs.create_job(
                req.text,
                parse_inference_options(
                    {
                        "provider": req.provider,
                        "voice": req.voice,
                        "language": req.language,
                        "speed": req.speed,
                    }
                ),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return {"id": job_id, "status": "queued"}

    @app.get("/api/projects")
    async def list_projects():
        jobs = get_jobs()
        return jobs.list_projects()

    @app.post("/api/projects")
    async def create_project(req: ProjectCreateRequest):
        jobs = get_jobs()
        project = jobs.create_project(title=req.title, provider=req.provider, voice=req.voice)
        return serialize_project(project)

    @app.post("/api/projects/sync")
    async def sync_project(req: ProjectSyncRequest):
        jobs = get_jobs()
        if not req.text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")
        try:
            options = parse_inference_options(
                {
                    "provider": req.provider,
                    "voice": req.voice,
                    "language": req.language,
                    "speed": req.speed,
                }
            )
            project = jobs.sync_project(
                req.project_id,
                req.text,
                options,
                blocks=req.blocks,
                block_voices=req.block_voices,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return serialize_project(jobs.get_project(project["id"]))

    @app.get("/api/projects/{project_id}")
    async def get_project(project_id: str):
        jobs = get_jobs()
        try:
            project = jobs.get_project(project_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Project not found")
        return serialize_project(project)

    @app.patch("/api/projects/{project_id}")
    async def update_project(project_id: str, req: ProjectUpdateRequest):
        jobs = get_jobs()
        try:
            project = jobs.update_project_metadata(project_id, title=req.title, pinned=req.pinned)
        except KeyError:
            raise HTTPException(status_code=404, detail="Project not found")
        return serialize_project(project)

    @app.delete("/api/projects/{project_id}")
    async def delete_project(project_id: str):
        jobs = get_jobs()
        try:
            jobs.delete_project(project_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"ok": True}

    @app.post("/api/projects/{project_id}/render")
    async def render_project(project_id: str):
        jobs = get_jobs()
        try:
            job_id = jobs.render_project(project_id)
            project = jobs.get_project(project_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Project not found")
        return {
            "project": serialize_project(project),
            "job_id": job_id,
            "status": "queued" if job_id else "ready",
        }

    @app.get("/api/projects/{project_id}/blocks/{block_index}/audio")
    async def get_project_block_audio(project_id: str, block_index: int):
        jobs = get_jobs()
        try:
            audio_path = jobs.get_project_block_audio_path(project_id, block_index)
        except KeyError:
            raise HTTPException(status_code=404, detail="Block not found")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Block status is {exc}")
        return FileResponse(audio_path, media_type="audio/wav")

    @app.get("/api/projects/{project_id}/download")
    async def download_project_audio(project_id: str):
        jobs = get_jobs()
        try:
            audio_path = jobs.get_project_final_audio_path(project_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Project not found")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Project download is {exc}")
        return FileResponse(audio_path, media_type="audio/wav", filename=f"{project_id}.wav")

    @app.get("/api/render/{job_id}")
    async def get_render_status(job_id: str):
        jobs = get_jobs()
        try:
            job = jobs.get_job(job_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Job not found")

        return JSONResponse(serialize_render_status(job))

    @app.get("/api/render/{job_id}/blocks/{block_index}/audio")
    async def get_render_block_audio(job_id: str, block_index: int):
        jobs = get_jobs()
        try:
            audio = jobs.get_block_audio(job_id, block_index)
        except KeyError:
            raise HTTPException(status_code=404, detail="Block not found")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Block status is {exc}")
        return StreamingResponse(io.BytesIO(audio), media_type="audio/wav")

    @app.get("/api/render/{job_id}/audio")
    async def get_render_audio(job_id: str):
        jobs = get_jobs()
        try:
            audio = jobs.get_final_audio(job_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Job not found")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Render status is {exc}")
        return StreamingResponse(io.BytesIO(audio), media_type="audio/wav")

    @app.get("/api/render/{job_id}/download")
    async def download_render_audio(job_id: str):
        jobs = get_jobs()
        try:
            audio = jobs.get_final_audio(job_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Job not found")
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Render status is {exc}")
        return StreamingResponse(
            io.BytesIO(audio),
            media_type="audio/wav",
            headers={"Content-Disposition": f'attachment; filename="{job_id}.wav"'},
        )

    return app


app = create_app()

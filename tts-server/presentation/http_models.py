from pydantic import BaseModel, Field


class RenderRequest(BaseModel):
    text: str
    provider: str = "omnivoice"
    voice: str = "speaker.wav"
    language: str = "cs"
    speed: float = Field(default=1.0, ge=0.7, le=1.3)


class ProjectSyncRequest(RenderRequest):
    project_id: str | None = None
    blocks: list[dict[str, str]] | None = None
    block_voices: list[str] | None = None


class ProjectCreateRequest(BaseModel):
    title: str | None = None
    provider: str | None = None
    voice: str | None = None


class ProjectUpdateRequest(BaseModel):
    title: str | None = None
    pinned: bool | None = None

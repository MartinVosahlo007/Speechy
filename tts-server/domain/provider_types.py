from typing import Literal

from pydantic import BaseModel, Field

TtsProviderId = Literal["omnivoice", "supertonic"]


class InferenceOptions(BaseModel):
    provider: TtsProviderId = "omnivoice"
    speed: float = Field(default=1.0, ge=0.7, le=1.3)
    voice: str = "speaker.wav"
    language: str = "cs"
    num_step: int = Field(default=32, ge=1, le=128)
    guidance_scale: float = Field(default=2.0, ge=0.0, le=10.0)
    denoise: bool = True
    preprocess_prompt: bool = True
    postprocess_output: bool = True

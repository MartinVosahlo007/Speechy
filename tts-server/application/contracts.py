from typing import Any, Protocol

from domain.provider_types import InferenceOptions, TtsProviderId


class TtsProviderRuntime(Protocol):
    provider_id: TtsProviderId
    provider_label: str
    model_name: str
    sync_text_limit: int
    long_form_chunk_chars: int
    default_inference: dict[str, Any]

    def default_voice_name(self) -> str:
        ...

    def list_voices(self) -> list[dict[str, Any]]:
        ...

    def supports_voice_upload(self) -> bool:
        ...

    def supports_style_import(self) -> bool:
        ...

    def import_voice_asset(self, filename: str, content: bytes) -> dict[str, Any]:
        ...

    def prepare_voice(self, voice_name: str, options: InferenceOptions | None = None) -> Any:
        ...

    def render_single_block(
        self,
        text: str,
        voice_name: str,
        language: str = "cs",
        speed: float = 1.0,
        prepared_voice=None,
        options: InferenceOptions | None = None,
    ) -> tuple[Any, int]:
        ...

    def concatenate_rendered_blocks(self, rendered_blocks: list[dict[str, Any]]):
        ...

    def write_final_wav(self, waveform, sample_rate: int) -> bytes:
        ...

    def read_final_wav(self, path) -> bytes:
        ...

    def read_wav(self, path):
        ...

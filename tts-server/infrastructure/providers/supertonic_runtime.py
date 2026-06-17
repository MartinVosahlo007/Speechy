import io
import json
import time
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf

from domain.provider_types import InferenceOptions

# #region agent log
_DEBUG_LOG_PATH = Path(__file__).resolve().parents[3] / "debug-3730a1.log"


def _agent_log(location: str, message: str, data: dict[str, Any], hypothesis_id: str) -> None:
    try:
        payload = {
            "sessionId": "3730a1",
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

BUILTIN_SUPERTONIC_VOICES = ("M1", "M2", "M3", "M4", "M5", "F1", "F2", "F3", "F4", "F5")


class SupertonicRuntime:
    provider_id = "supertonic"
    provider_label = "Supertonic"
    model_name = "supertonic-3"
    sync_text_limit = 500
    long_form_chunk_chars = 300
    sample_rate = 44100
    default_inference = {
        "language": "cs",
        "speed": 1.0,
    }

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.styles_dir = base_dir / "voices" / "supertonic"
        self.styles_dir.mkdir(parents=True, exist_ok=True)
        self._tts = None
        self._tts_class = None
        self._ensure_sdk()

    def default_voice_name(self) -> str:
        return "M1"

    def list_voices(self) -> list[dict[str, Any]]:
        voices: list[dict[str, Any]] = []
        default_voice = self.default_voice_name()
        for voice_name in BUILTIN_SUPERTONIC_VOICES:
            voices.append(
                {
                    "name": voice_name,
                    "label": voice_name,
                    "path": "",
                    "size": 0,
                    "is_default": voice_name == default_voice,
                    "provider": self.provider_id,
                    "kind": "builtin-style",
                    "has_transcript": False,
                    "transcript": None,
                }
            )
        for style_path in sorted(self.styles_dir.glob("*.json")):
            voices.append(
                {
                    "name": style_path.stem,
                    "label": style_path.stem,
                    "path": str(style_path),
                    "size": style_path.stat().st_size,
                    "is_default": False,
                    "provider": self.provider_id,
                    "kind": "custom-style",
                    "has_transcript": False,
                    "transcript": None,
                }
            )
        return voices

    def supports_voice_upload(self) -> bool:
        return False

    def supports_style_import(self) -> bool:
        return True

    def import_voice_asset(self, filename: str, content: bytes) -> dict[str, Any]:
        if not filename.lower().endswith(".json"):
            raise ValueError("Only Voice Builder JSON files are supported.")
        safe_name = Path(filename).name
        output_path = self.styles_dir / safe_name
        payload = json.loads(content.decode("utf-8"))
        output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return {
            "name": output_path.stem,
            "label": output_path.stem,
            "path": str(output_path),
            "size": output_path.stat().st_size,
            "is_default": False,
            "provider": self.provider_id,
            "kind": "custom-style",
            "has_transcript": False,
            "transcript": None,
        }

    def prepare_voice(self, voice_name: str, options: InferenceOptions | None = None):
        tts = self._ensure_tts()
        custom_style_path = self.styles_dir / f"{voice_name}.json"
        if custom_style_path.exists():
            return tts.get_voice_style_from_path(str(custom_style_path))
        if voice_name in BUILTIN_SUPERTONIC_VOICES:
            return tts.get_voice_style(voice_name=voice_name)
        raise FileNotFoundError(f"Voice '{voice_name}' was not found.")

    def render_single_block(
        self,
        text: str,
        voice_name: str,
        language: str = "cs",
        speed: float = 1.0,
        prepared_voice=None,
        options: InferenceOptions | None = None,
    ):
        tts = self._ensure_tts()
        # #region agent log
        unusual_chars = sorted({char for char in text if ord(char) > 127 or char in "„‚«»"})
        is_valid, unsupported = tts.model.text_processor.validate_text(text)
        _agent_log(
            "supertonic_runtime.py:render_single_block",
            "supertonic pre-synthesize validation",
            {
                "provider": self.provider_id,
                "language": language,
                "textLength": len(text),
                "textPreview": text[:120],
                "unusualChars": unusual_chars,
                "isValid": is_valid,
                "unsupported": unsupported,
            },
            "A",
        )
        # #endregion
        voice_style = prepared_voice or self.prepare_voice(voice_name, options=options)
        waveform, _ = tts.synthesize(
            text=text,
            lang=language or self.default_inference["language"],
            voice_style=voice_style,
            total_steps=8,
            speed=speed,
            max_chunk_length=self.long_form_chunk_chars,
            silence_duration=0.0,
        )
        audio = np.asarray(waveform, dtype=np.float32).squeeze()
        return audio, self.sample_rate

    def concatenate_rendered_blocks(self, rendered_blocks: list[dict[str, Any]]):
        if not rendered_blocks:
            raise ValueError("No rendered blocks were provided.")

        sample_rate = rendered_blocks[0]["sample_rate"]
        combined: list[np.ndarray] = []
        timeline = []
        current_sample = 0

        for index, block in enumerate(rendered_blocks):
            waveform = np.asarray(block["waveform"], dtype=np.float32).squeeze()
            start_ms = int((current_sample / sample_rate) * 1000)
            current_sample += int(waveform.shape[-1])
            end_ms = int((current_sample / sample_rate) * 1000)
            timeline.append(
                {
                    "index": index,
                    "text": block["text"],
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                }
            )
            combined.append(waveform)

        return np.concatenate(combined), sample_rate, timeline

    def write_final_wav(self, waveform, sample_rate: int) -> bytes:
        audio = np.asarray(waveform, dtype=np.float32).squeeze()
        with io.BytesIO() as buffer:
            sf.write(buffer, audio, sample_rate, format="WAV")
            return buffer.getvalue()

    def read_final_wav(self, path: Path) -> bytes:
        return path.read_bytes()

    def read_wav(self, path: Path):
        waveform, sample_rate = sf.read(path, dtype="float32")
        return waveform, int(sample_rate)

    def _ensure_tts(self):
        if self._tts is not None:
            return self._tts

        self._tts = self._tts_class(auto_download=True)
        return self._tts

    def _ensure_sdk(self):
        if self._tts_class is not None:
            return self._tts_class
        from supertonic import TTS

        self._tts_class = TTS
        return self._tts_class

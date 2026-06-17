import os
from pathlib import Path
from typing import TYPE_CHECKING

from application.job_service import JobService
from application.provider_registry import ProviderRegistry
from domain.provider_types import InferenceOptions

if TYPE_CHECKING:
    from application.provider_registry import ProviderRegistry

BASE_DIR = Path(__file__).resolve().parents[1]


def create_runtime_registry() -> ProviderRegistry:
    from infrastructure.providers import OmniVoiceRuntime, SupertonicRuntime

    runtimes = {}
    statuses: list[dict[str, object]] = []

    omnivoice = OmniVoiceRuntime(BASE_DIR)
    runtimes[omnivoice.provider_id] = omnivoice
    statuses.append(
        {
            "id": omnivoice.provider_id,
            "label": omnivoice.provider_label,
            "online": True,
            "model": omnivoice.model_name,
        }
    )

    try:
        supertonic = SupertonicRuntime(BASE_DIR)
        supertonic.list_voices()
        runtimes[supertonic.provider_id] = supertonic
        statuses.append(
            {
                "id": supertonic.provider_id,
                "label": supertonic.provider_label,
                "online": True,
                "model": supertonic.model_name,
            }
        )
    except Exception as exc:
        statuses.append(
            {
                "id": "supertonic",
                "label": "Supertonic",
                "online": False,
                "model": "supertonic-3",
                "error": str(exc),
            }
        )

    configured_default = os.environ.get("TTS_DEFAULT_PROVIDER", "omnivoice").strip() or "omnivoice"
    default_provider_id = configured_default if configured_default in runtimes else next(iter(runtimes))
    return ProviderRegistry(
        runtimes=runtimes,
        statuses=statuses,
        default_provider_id=default_provider_id,
    )


def create_jobs(runtime_registry: "ProviderRegistry"):
    configured_storage_dir = os.environ.get("TTS_SERVER_STORAGE_DIR", "").strip()
    storage_dir = Path(configured_storage_dir) if configured_storage_dir else BASE_DIR / "tmp-jobs"
    return JobService(runtime_registry, storage_dir=storage_dir)


def parse_inference_options(payload: dict) -> "InferenceOptions":
    return InferenceOptions(**payload)

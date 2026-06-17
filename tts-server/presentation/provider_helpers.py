from fastapi import HTTPException

from application.provider_registry import ProviderRegistry
from presentation.dependencies import create_runtime_registry


def ensure_runtime_registry(runtime_registry_instance, runtime):
    if runtime_registry_instance is not None:
        return runtime_registry_instance
    if runtime is not None:
        runtime_provider_id = getattr(runtime, "provider_id", "omnivoice")
        runtime_label = getattr(runtime, "provider_label", runtime_provider_id.title())
        return ProviderRegistry(
            runtimes={runtime_provider_id: runtime},
            statuses=[
                {
                    "id": runtime_provider_id,
                    "label": runtime_label,
                    "online": True,
                    "model": getattr(runtime, "model_name", "runtime"),
                }
            ],
            default_provider_id=runtime_provider_id,
        )
    return create_runtime_registry()


def build_health_payload(registry: ProviderRegistry):
    runtime = registry.default_runtime()
    default_voice = runtime.default_voice_name() if hasattr(runtime, "default_voice_name") else runtime.voice_store.default_voice_name
    return {
        "status": "ok",
        "default_provider": registry.default_provider_id,
        "providers": registry.list_statuses(),
        "model": runtime.model_name,
        "mode": "progressive",
        "gpu": getattr(runtime, "gpu_info", {"device": "cpu"}),
        "default_voice": default_voice,
        "defaults": runtime.default_inference,
        "long_form_chunk_chars": runtime.long_form_chunk_chars,
        "sync_text_limit": runtime.sync_text_limit,
    }


def build_voice_payload(registry: ProviderRegistry, provider: str | None = None):
    try:
        runtime = registry.get_runtime(provider)
    except KeyError:
        raise HTTPException(status_code=503, detail=f"Provider '{provider}' is not available.")

    voices = runtime.list_voices() if hasattr(runtime, "list_voices") else [
        runtime.voice_store.serialize(path) for path in runtime.voice_store.list_voice_paths()
    ]
    default_voice = runtime.default_voice_name() if hasattr(runtime, "default_voice_name") else runtime.voice_store.default_voice_name
    return {
        "provider": getattr(runtime, "provider_id", registry.default_provider_id),
        "default_voice": default_voice,
        "voices": voices,
    }


def import_provider_voice(registry: ProviderRegistry, provider_id: str, filename: str, content: bytes):
    try:
        runtime = registry.get_runtime(provider_id)
    except KeyError:
        raise HTTPException(status_code=503, detail=f"Provider '{provider_id}' is not available.")
    try:
        return runtime.import_voice_asset(filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

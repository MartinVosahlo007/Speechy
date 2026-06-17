import os
from pathlib import Path
from infrastructure.model_cache import configure_model_cache
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_TTS_SERVER_PORT = 18100
configure_model_cache(BASE_DIR)
if __name__ == "__main__":
    import uvicorn
    reload_enabled = os.environ.get("TTS_SERVER_RELOAD", "").strip().lower() in {"1", "true", "yes", "on"}
    uvicorn.run(
        "presentation.http:app",
        host="0.0.0.0",
        port=int(os.environ.get("TTS_SERVER_PORT") or os.environ.get("PORT") or str(DEFAULT_TTS_SERVER_PORT)),
        reload=reload_enabled,
        reload_dirs=[str(BASE_DIR / folder) for folder in ("presentation", "application", "domain", "infrastructure")],
    )

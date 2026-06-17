from typing import Any


class ProviderRegistry:
    def __init__(self, *, runtimes: dict[str, Any], statuses: list[dict[str, Any]], default_provider_id: str):
        self._runtimes = runtimes
        self._statuses = statuses
        self.default_provider_id = default_provider_id

    def default_runtime(self):
        return self.get_runtime(self.default_provider_id)

    def get_runtime(self, provider_id: str | None):
        resolved = provider_id or self.default_provider_id
        runtime = self._runtimes.get(resolved)
        if runtime is None:
            raise KeyError(resolved)
        return runtime

    def has_runtime(self, provider_id: str) -> bool:
        return provider_id in self._runtimes

    def list_statuses(self) -> list[dict[str, Any]]:
        return [dict(status) for status in self._statuses]

    def available_provider_ids(self) -> list[str]:
        return list(self._runtimes.keys())

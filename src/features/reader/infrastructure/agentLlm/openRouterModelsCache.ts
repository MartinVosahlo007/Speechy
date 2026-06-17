import type { NormalizedOpenRouterModel } from "../../domain/agentLlmTypes";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

type CacheEntry = {
  models: NormalizedOpenRouterModel[];
  fetchedAt: number;
};

let cache: CacheEntry | null = null;

export function getCachedOpenRouterModels(
  ttlMs: number = DEFAULT_TTL_MS,
): { models: NormalizedOpenRouterModel[]; stale: boolean } | null {
  if (!cache) return null;
  const age = Date.now() - cache.fetchedAt;
  return {
    models: cache.models,
    stale: age > ttlMs,
  };
}

export function setCachedOpenRouterModels(models: NormalizedOpenRouterModel[]) {
  cache = {
    models,
    fetchedAt: Date.now(),
  };
}

export function clearOpenRouterModelsCache() {
  cache = null;
}

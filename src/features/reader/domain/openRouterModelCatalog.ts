import type {
  NormalizedOpenRouterModel,
  OpenRouterModelFilters,
  OpenRouterModelSortKey,
} from "./agentLlmTypes";

export type OpenRouterApiModel = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
    request?: string | number;
    image?: string | number;
    web_search?: string | number;
    internal_reasoning?: string | number;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
};

export function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toPricePerMillion(pricePerToken: number | null): number | null {
  return pricePerToken === null ? null : pricePerToken * 1_000_000;
}

export function formatContextLength(value: number | null): string {
  if (!value || value <= 0) return "?";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
}

export function formatUsdPerMillion(value: number | null): string {
  if (value === null) return "unknown";
  if (value === 0) return "free";
  if (value < 0.01) return `$${value.toFixed(4)}/1M`;
  if (value < 1) return `$${value.toFixed(3)}/1M`;
  return `$${value.toFixed(2)}/1M`;
}

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function hasSupportedParameter(params: string[], names: string[]): boolean {
  const lower = params.map((p) => p.toLowerCase());
  return names.some((name) => lower.includes(name.toLowerCase()));
}

export function normalizeOpenRouterModel(raw: OpenRouterApiModel): NormalizedOpenRouterModel | null {
  if (!raw?.id || typeof raw.id !== "string") return null;

  const inputPricePerToken = parsePrice(raw.pricing?.prompt);
  const outputPricePerToken = parsePrice(raw.pricing?.completion);
  const inputPricePerMillion = toPricePerMillion(inputPricePerToken);
  const outputPricePerMillion = toPricePerMillion(outputPricePerToken);
  const supportedParameters = Array.isArray(raw.supported_parameters)
    ? raw.supported_parameters.filter((p): p is string => typeof p === "string")
    : [];

  const isFree =
    inputPricePerToken !== null &&
    outputPricePerToken !== null &&
    inputPricePerToken === 0 &&
    outputPricePerToken === 0;

  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : raw.id,
    provider: "openrouter",
    contextLength: parsePositiveInt(raw.context_length),
    providerContextLength: parsePositiveInt(raw.top_provider?.context_length),
    maxCompletionTokens: parsePositiveInt(raw.top_provider?.max_completion_tokens),
    inputPricePerToken,
    outputPricePerToken,
    inputPricePerMillion,
    outputPricePerMillion,
    isFree,
    inputModalities: Array.isArray(raw.architecture?.input_modalities)
      ? raw.architecture.input_modalities.filter((m): m is string => typeof m === "string")
      : [],
    outputModalities: Array.isArray(raw.architecture?.output_modalities)
      ? raw.architecture.output_modalities.filter((m): m is string => typeof m === "string")
      : [],
    supportedParameters,
    supportsTools: hasSupportedParameter(supportedParameters, ["tools"]),
    supportsStructuredOutputs: hasSupportedParameter(supportedParameters, [
      "structured_outputs",
      "response_format",
    ]),
    supportsReasoning: hasSupportedParameter(supportedParameters, ["reasoning"]),
  };
}

export function stripOpenRouterModelRaw(
  model: NormalizedOpenRouterModel,
): NormalizedOpenRouterModel {
  const { raw: _raw, ...withoutRaw } = model;
  return withoutRaw;
}

export function normalizeOpenRouterModels(
  models: OpenRouterApiModel[],
): NormalizedOpenRouterModel[] {
  return models
    .map((model) => normalizeOpenRouterModel(model))
    .filter((model): model is NormalizedOpenRouterModel => model !== null);
}

function matchesSearch(model: NormalizedOpenRouterModel, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    model.id.toLowerCase().includes(needle) ||
    model.name.toLowerCase().includes(needle)
  );
}

export function filterOpenRouterModels(
  models: NormalizedOpenRouterModel[],
  filters: OpenRouterModelFilters,
): NormalizedOpenRouterModel[] {
  return models.filter((model) => {
    if (filters.search && !matchesSearch(model, filters.search)) return false;
    if (filters.freeOnly && !model.isFree) return false;
    if (
      filters.maxInputPricePerMillion != null &&
      model.inputPricePerMillion !== null &&
      model.inputPricePerMillion > filters.maxInputPricePerMillion
    ) {
      return false;
    }
    if (
      filters.maxOutputPricePerMillion != null &&
      model.outputPricePerMillion !== null &&
      model.outputPricePerMillion > filters.maxOutputPricePerMillion
    ) {
      return false;
    }
    return true;
  });
}

function sortValue(
  model: NormalizedOpenRouterModel,
  key: OpenRouterModelSortKey,
): string | number {
  switch (key) {
    case "contextLength":
      return model.contextLength ?? model.providerContextLength ?? -1;
    case "inputPrice":
      return model.inputPricePerMillion ?? Number.POSITIVE_INFINITY;
    case "outputPrice":
      return model.outputPricePerMillion ?? Number.POSITIVE_INFINITY;
    case "name":
      return model.name.toLowerCase();
    default:
      return model.name.toLowerCase();
  }
}

export function sortOpenRouterModels(
  models: NormalizedOpenRouterModel[],
  sortKey: OpenRouterModelSortKey,
  direction: "asc" | "desc" = "desc",
): NormalizedOpenRouterModel[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...models].sort((left, right) => {
    const leftValue = sortValue(left, sortKey);
    const rightValue = sortValue(right, sortKey);
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor;
    }
    return String(leftValue).localeCompare(String(rightValue), "cs") * factor;
  });
}

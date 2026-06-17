export type AgentLlmProviderId = "minimax" | "openrouter";

export type AgentChatRole = "user" | "assistant";
export type AgentLlmChatRole = AgentChatRole | "system";

export type AgentChatMessage = {
  role: AgentChatRole;
  content: string;
};

export type AgentLlmChatMessage = {
  role: AgentLlmChatRole;
  content: string;
};

export type AgentChatResponse = {
  message: string;
  blocks: AgentScriptBlock[] | null;
};

export type AgentScriptBlock = {
  text: string;
  voice: string;
};

export type AgentLlmCompletionResult = {
  content: string;
};

export type NormalizedOpenRouterModel = {
  id: string;
  name: string;
  provider: "openrouter";

  contextLength: number | null;
  providerContextLength: number | null;
  maxCompletionTokens: number | null;

  inputPricePerToken: number | null;
  outputPricePerToken: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;

  isFree: boolean;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];

  supportsTools: boolean;
  supportsStructuredOutputs: boolean;
  supportsReasoning: boolean;

  raw?: unknown;
};

export type OpenRouterModelSortKey =
  | "contextLength"
  | "inputPrice"
  | "outputPrice"
  | "name";

export type OpenRouterModelFilters = {
  search?: string;
  freeOnly?: boolean;
  maxInputPricePerMillion?: number | null;
  maxOutputPricePerMillion?: number | null;
};

export type AgentLlmSettingsState = {
  selectedLlmProvider: AgentLlmProviderId;
  selectedOpenRouterModel: string;
};

export type AgentLlmProviderStatus = {
  minimax: { configured: boolean };
  openrouter: { configured: boolean };
  defaultProvider: AgentLlmProviderId;
};

export type OpenRouterModelsResponse = {
  models: NormalizedOpenRouterModel[];
  stale?: boolean;
  warning?: string;
};

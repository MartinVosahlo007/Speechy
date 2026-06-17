import type { AgentLlmProviderId, AgentLlmSettingsState } from "../domain/agentLlmTypes";

export const DEFAULT_AGENT_LLM_SETTINGS: AgentLlmSettingsState = {
  selectedLlmProvider: "minimax",
  selectedOpenRouterModel: "",
};

export function resolveAgentLlmSettings(
  stored: Partial<AgentLlmSettingsState> | null | undefined,
  defaults: AgentLlmSettingsState = DEFAULT_AGENT_LLM_SETTINGS,
): AgentLlmSettingsState {
  const provider =
    stored?.selectedLlmProvider === "openrouter" ? "openrouter" : defaults.selectedLlmProvider;
  const selectedOpenRouterModel =
    typeof stored?.selectedOpenRouterModel === "string"
      ? stored.selectedOpenRouterModel
      : defaults.selectedOpenRouterModel;

  return {
    selectedLlmProvider: provider,
    selectedOpenRouterModel,
  };
}

export function setAgentLlmProvider(
  state: AgentLlmSettingsState,
  provider: AgentLlmProviderId,
): AgentLlmSettingsState {
  return {
    ...state,
    selectedLlmProvider: provider,
  };
}

export function setSelectedOpenRouterModel(
  state: AgentLlmSettingsState,
  model: string,
): AgentLlmSettingsState {
  return {
    ...state,
    selectedOpenRouterModel: model,
  };
}

export function resolveActiveOpenRouterModel(
  state: AgentLlmSettingsState,
  fallbackModel: string,
): string {
  return state.selectedOpenRouterModel || fallbackModel;
}

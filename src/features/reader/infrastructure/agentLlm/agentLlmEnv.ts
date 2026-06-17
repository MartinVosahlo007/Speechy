import type { AgentLlmProviderId, AgentLlmProviderStatus } from "../../domain/agentLlmTypes";
import { looksLikeOpenRouterKey, normalizeOpenRouterApiKey } from "../../domain/openRouterApiKey";
import { resolveDefaultAgentLlmProvider } from "./agentLlmRouter";
import { resolveMinimaxModel } from "./minimaxProvider";

export function readAgentLlmProviderStatus(): AgentLlmProviderStatus {
  const minimaxConfigured = Boolean(process.env.MINIMAX_API_KEY?.trim());
  const openRouterKey = normalizeOpenRouterApiKey(process.env.OPENROUTER_API_KEY);
  const openrouterConfigured =
    Boolean(openRouterKey) && looksLikeOpenRouterKey(openRouterKey);

  return {
    minimax: { configured: minimaxConfigured },
    openrouter: { configured: openrouterConfigured },
    defaultProvider: resolveDefaultAgentLlmProvider(process.env.AGENT_LLM_PROVIDER),
  };
}

export function readDefaultOpenRouterModel(): string {
  return process.env.OPENROUTER_DEFAULT_MODEL?.trim() ?? "";
}

export function readMinimaxModelFromEnv(): string {
  return resolveMinimaxModel(process.env.MINIMAX_MODEL);
}

export function resolveRequestedProvider(
  requested: unknown,
  fallback: AgentLlmProviderId,
): AgentLlmProviderId {
  return requested === "openrouter" ? "openrouter" : fallback;
}

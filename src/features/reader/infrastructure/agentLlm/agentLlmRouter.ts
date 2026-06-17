import type { AgentLlmProviderId, AgentLlmChatMessage, AgentLlmCompletionResult } from "../../domain/agentLlmTypes";
import { looksLikeOpenRouterKey, normalizeOpenRouterApiKey } from "../../domain/openRouterApiKey";
import { completeMinimaxChat, resolveMinimaxModel } from "./minimaxProvider";
import { formatOpenRouterKeyError } from "./openRouterClient";
import { completeOpenRouterChat } from "./openRouterProvider";

export type AgentLlmRouterOptions = {
  provider: AgentLlmProviderId;
  messages: AgentLlmChatMessage[];
  minimaxApiKey?: string;
  minimaxModel?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
};

export function resolveDefaultAgentLlmProvider(
  envValue: string | undefined,
): AgentLlmProviderId {
  return envValue === "openrouter" ? "openrouter" : "minimax";
}

export function readOpenRouterApiKeyFromEnv(
  envValue: string | undefined,
): string | null {
  const key = normalizeOpenRouterApiKey(envValue);
  if (!key) return null;
  if (!looksLikeOpenRouterKey(key)) return null;
  return key;
}

export async function completeWithProvider(
  options: AgentLlmRouterOptions,
): Promise<AgentLlmCompletionResult> {
  if (options.provider === "openrouter") {
    const apiKey = readOpenRouterApiKeyFromEnv(options.openRouterApiKey);
    if (!apiKey) {
      throw new Error(
        options.openRouterApiKey
          ? formatOpenRouterKeyError(options.openRouterApiKey)
          : "OPENROUTER_API_KEY není nastavený na serveru.",
      );
    }
    const model = options.openRouterModel?.trim();
    if (!model) {
      throw new Error("Není vybraný OpenRouter model.");
    }
    return completeOpenRouterChat({
      apiKey,
      model,
      messages: options.messages,
    });
  }

  const apiKey = options.minimaxApiKey?.trim();
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY není nastavený na serveru.");
  }

  return completeMinimaxChat({
    apiKey,
    model: resolveMinimaxModel(options.minimaxModel),
    messages: options.messages,
  });
}

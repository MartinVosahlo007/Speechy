import type { AgentLlmChatMessage, AgentLlmCompletionResult } from "../../domain/agentLlmTypes";
import { fetchOpenRouterChatCompletion } from "./openRouterClient";

export type OpenRouterCompletionOptions = {
  apiKey: string;
  model: string;
  messages: AgentLlmChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

export async function completeOpenRouterChat(
  options: OpenRouterCompletionOptions,
): Promise<AgentLlmCompletionResult> {
  const content = await fetchOpenRouterChatCompletion({
    apiKey: options.apiKey,
    model: options.model,
    messages: options.messages,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
  return { content };
}

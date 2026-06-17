import type {
  AgentChatMessage,
  AgentChatResponse,
  AgentLlmProviderId,
  AgentLlmProviderStatus,
  OpenRouterModelsResponse,
} from "../domain/agentLlmTypes";
import type { Voice } from "../domain/types";

export type SendAgentChatInput = {
  messages: AgentChatMessage[];
  voices: Voice[];
  defaultVoice: string;
  provider: AgentLlmProviderId;
  openRouterModel: string;
};

export async function fetchAgentLlmProviderStatus(): Promise<AgentLlmProviderStatus> {
  const response = await fetch("/api/agent/status");
  const data = (await response.json().catch(() => null)) as AgentLlmProviderStatus | null;
  if (!response.ok || !data) {
    throw new Error("Nepodařilo se načíst stav AI providerů.");
  }
  return data;
}

export async function fetchOpenRouterModels(
  forceRefresh = false,
): Promise<OpenRouterModelsResponse> {
  const query = forceRefresh ? "?forceRefresh=true" : "";
  const response = await fetch(`/api/agent/models${query}`);
  const data = (await response.json().catch(() => null)) as
    | OpenRouterModelsResponse
    | { error?: string }
    | null;
  if (!response.ok || !data || !("models" in data)) {
    throw new Error(
      data && "error" in data && data.error
        ? data.error
        : "Nepodařilo se načíst OpenRouter modely.",
    );
  }
  return data;
}

export async function sendAgentChatRequest(
  input: SendAgentChatInput,
): Promise<AgentChatResponse> {
  const response = await fetch("/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: input.messages,
      defaultVoice: input.defaultVoice,
      provider: input.provider,
      openRouterModel: input.openRouterModel,
      voices: input.voices.map((voice) => ({
        name: voice.name,
        transcript: voice.transcript ?? null,
      })),
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | { message?: string; blocks?: AgentChatResponse["blocks"]; error?: string }
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Agent selhal.");
  }
  return {
    message: typeof data.message === "string" ? data.message : "",
    blocks: Array.isArray(data.blocks) ? data.blocks : null,
  };
}

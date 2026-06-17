import { maskApiKey } from "../../domain/openRouterApiKey";
import type { AgentLlmChatMessage } from "../../domain/agentLlmTypes";
import type { OpenRouterApiModel } from "../../domain/openRouterModelCatalog";

const CHAT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";
const APP_TITLE = "Speechy";
const APP_REFERER = "https://speechy.local";

export type OpenRouterChatRequest = {
  apiKey: string;
  model: string;
  messages: AgentLlmChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type OpenRouterModelsApiResponse = {
  data?: OpenRouterApiModel[];
};

export function mapOpenRouterHttpError(status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (status === 401 || status === 403) {
    return "Špatný nebo chybějící OpenRouter API klíč.";
  }
  if (status === 402 || lower.includes("billing") || lower.includes("credit")) {
    return "Problém s kredity nebo billingem OpenRouter účtu.";
  }
  if (status === 404 || lower.includes("model") && lower.includes("not found")) {
    return "Zvolený OpenRouter model není dostupný.";
  }
  if (status === 429) {
    return "OpenRouter rate limit — zkuste to později.";
  }
  if (status >= 500) {
    return "Chyba OpenRouter nebo upstream provideru.";
  }
  return `OpenRouter vrátil chybu ${status}: ${detail.slice(0, 300)}`;
}

function buildOpenRouterHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": APP_REFERER,
    "X-Title": APP_TITLE,
  };
}

export async function fetchOpenRouterChatCompletion(
  request: OpenRouterChatRequest,
): Promise<string> {
  let apiResponse: Response;
  try {
    apiResponse = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: buildOpenRouterHeaders(request.apiKey),
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 4000,
      }),
    });
  } catch (err) {
    throw new Error(
      `Síťový problém při volání OpenRouter: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!apiResponse.ok) {
    const detail = await apiResponse.text().catch(() => "");
    throw new Error(mapOpenRouterHttpError(apiResponse.status, detail));
  }

  const apiJson = (await apiResponse.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = apiJson?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter vrátil prázdnou odpověď.");
  }
  return content;
}

export async function fetchOpenRouterModelsRaw(apiKey: string): Promise<OpenRouterApiModel[]> {
  let apiResponse: Response;
  try {
    apiResponse = await fetch(MODELS_ENDPOINT, {
      method: "GET",
      headers: buildOpenRouterHeaders(apiKey),
    });
  } catch (err) {
    throw new Error(
      `Síťový problém při načítání OpenRouter modelů: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  if (!apiResponse.ok) {
    const detail = await apiResponse.text().catch(() => "");
    throw new Error(mapOpenRouterHttpError(apiResponse.status, detail));
  }

  const apiJson = (await apiResponse.json().catch(() => null)) as
    | OpenRouterModelsApiResponse
    | null;
  if (!apiJson || !Array.isArray(apiJson.data)) {
    throw new Error("OpenRouter vrátil neplatný seznam modelů.");
  }
  return apiJson.data;
}

export function formatOpenRouterKeyError(apiKey: string): string {
  return `OpenRouter API klíč (${maskApiKey(apiKey)}) není platný.`;
}

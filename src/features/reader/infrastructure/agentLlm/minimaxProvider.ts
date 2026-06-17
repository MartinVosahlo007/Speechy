import type { AgentLlmChatMessage, AgentLlmCompletionResult } from "../../domain/agentLlmTypes";

const ENDPOINT = "https://api.minimaxi.chat/v1/text/chatcompletion_v2";
const DEFAULT_MODEL = "MiniMax-M2.7";

export type MinimaxCompletionOptions = {
  apiKey: string;
  model?: string;
  messages: AgentLlmChatMessage[];
  temperature?: number;
};

export function resolveMinimaxModel(model?: string): string {
  return model?.trim() || DEFAULT_MODEL;
}

export async function completeMinimaxChat(
  options: MinimaxCompletionOptions,
): Promise<AgentLlmCompletionResult> {
  const model = resolveMinimaxModel(options.model);
  let apiResponse: Response;
  try {
    apiResponse = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
      }),
    });
  } catch (err) {
    throw new Error(
      `Spojení s MiniMax selhalo: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!apiResponse.ok) {
    const detail = await apiResponse.text().catch(() => "");
    throw new Error(
      `MiniMax vrátil chybu ${apiResponse.status}: ${detail.slice(0, 500)}`,
    );
  }

  const apiJson = (await apiResponse.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;
  const content = apiJson?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("MiniMax vrátil prázdnou odpověď.");
  }

  return { content };
}

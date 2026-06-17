import { NextRequest, NextResponse } from "next/server";
import type { AgentLlmChatMessage } from "@/features/reader/domain/agentLlmTypes";
import {
  buildAgentSystemPrompt,
  extractAgentScriptBlocks,
  type AgentVoiceInput,
} from "@/features/reader/domain/agentScriptParsing";
import {
  completeWithProvider,
  resolveDefaultAgentLlmProvider,
} from "@/features/reader/infrastructure/agentLlm/agentLlmRouter";
import {
  readDefaultOpenRouterModel,
  readMinimaxModelFromEnv,
  resolveRequestedProvider,
} from "@/features/reader/infrastructure/agentLlm/agentLlmEnv";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        messages?: unknown;
        voices?: unknown;
        defaultVoice?: unknown;
        provider?: unknown;
        openRouterModel?: unknown;
      }
    | null;
  if (!body || !Array.isArray(body.messages) || !Array.isArray(body.voices)) {
    return NextResponse.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const messages = (body.messages as ChatMessage[]).filter(
    (msg): msg is ChatMessage =>
      Boolean(
        msg &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.trim().length > 0,
      ),
  );
  if (!messages.length) {
    return NextResponse.json({ error: "Chat je prázdný." }, { status: 400 });
  }

  const voices = (body.voices as AgentVoiceInput[]).filter(
    (voice): voice is AgentVoiceInput =>
      Boolean(voice && typeof voice.name === "string"),
  );
  if (!voices.length) {
    return NextResponse.json(
      { error: "Nejsou k dispozici žádné hlasy." },
      { status: 400 },
    );
  }

  const defaultVoice =
    typeof body.defaultVoice === "string" && body.defaultVoice
      ? body.defaultVoice
      : voices[0]?.name ?? "";

  const defaultProvider = resolveDefaultAgentLlmProvider(process.env.AGENT_LLM_PROVIDER);
  const provider = resolveRequestedProvider(body.provider, defaultProvider);
  const openRouterModel =
    typeof body.openRouterModel === "string" && body.openRouterModel.trim()
      ? body.openRouterModel.trim()
      : readDefaultOpenRouterModel();

  const systemPrompt = buildAgentSystemPrompt(voices, defaultVoice);
  const llmMessages: AgentLlmChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  let completion;
  try {
    completion = await completeWithProvider({
      provider,
      messages: llmMessages,
      minimaxApiKey: process.env.MINIMAX_API_KEY,
      minimaxModel: readMinimaxModelFromEnv(),
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      openRouterModel,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent selhal." },
      { status: provider === "openrouter" ? 502 : 500 },
    );
  }

  const voiceNames = new Set(voices.map((voice) => voice.name));
  const { messageText, blocks } = extractAgentScriptBlocks(
    completion.content,
    voiceNames,
    defaultVoice,
  );

  return NextResponse.json({
    message: messageText,
    blocks: blocks ?? null,
  });
}

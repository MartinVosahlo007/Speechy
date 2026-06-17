import type {
  AgentChatMessage,
  AgentChatResponse,
  AgentLlmProviderId,
  AgentScriptBlock,
} from "../domain/agentLlmTypes";
import { splitTextIntoParagraphChunks } from "../domain/chunking";
import type { ProjectSnapshot, TtsProviderId, Voice } from "../domain/types";
import { sendAgentChatRequest } from "../infrastructure/agentChatApi";
import type { ReaderAction } from "./readerActions";
import { readerActions } from "./readerActions";
import { applySplitBlocksState, prepareReaderProject } from "./readerProjectCommands";
import type { ProjectPreparationInput } from "./useProjectPreparation";

type Dispatch = (action: ReaderAction) => void;

export type { AgentChatMessage, AgentChatResponse, AgentScriptBlock } from "../domain/agentLlmTypes";

export type SendAgentChatOptions = {
  provider: AgentLlmProviderId;
  openRouterModel: string;
};

export async function sendAgentChatMessage(
  messages: AgentChatMessage[],
  voices: Voice[],
  defaultVoice: string,
  options: SendAgentChatOptions,
): Promise<AgentChatResponse> {
  return sendAgentChatRequest({
    messages,
    voices,
    defaultVoice,
    provider: options.provider,
    openRouterModel: options.openRouterModel,
  });
}

export type ApplyAgentScriptInput = {
  blocks: AgentScriptBlock[];
  provider: TtsProviderId;
  defaultVoice: string;
  speed: number;
  dispatch: Dispatch;
  prepareProject: (input: ProjectPreparationInput) => Promise<ProjectSnapshot | null>;
};

export async function applyAgentScript(
  input: ApplyAgentScriptInput,
): Promise<ProjectSnapshot | null> {
  const { dispatch, blocks, provider, defaultVoice, speed, prepareProject } = input;
  if (!blocks.length) throw new Error("Žádné bloky k aplikování.");

  const text = blocks.map((block) => block.text).join("\n\n");
  const chunks = splitTextIntoParagraphChunks(text);
  if (!chunks.length) throw new Error("Z bloků nelze sestavit text.");

  const blockVoices = chunks.map(
    (_, index) => blocks[index]?.voice ?? defaultVoice,
  );

  dispatch(readerActions.setError(null));
  dispatch(readerActions.setText(text));
  applySplitBlocksState(dispatch, chunks.length, blockVoices);

  return prepareReaderProject({
    prepareProject,
    projectId: null,
    provider,
    text,
    voice: defaultVoice,
    speed,
    blocks: chunks,
    blockVoices,
  });
}

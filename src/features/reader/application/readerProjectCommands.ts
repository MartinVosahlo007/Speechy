import type { PlaybackChunk } from "../domain/chunking";
import type { ProjectSnapshot, TtsProviderId, Voice } from "../domain/types";
import { getWorkflowStageForBlocks } from "../domain/workflow";
import type { ReaderAction } from "./readerActions";
import { readerActions } from "./readerActions";
import type { ProjectPreparationInput } from "./useProjectPreparation";
import { buildProjectPreparationInput, resetReaderEditingState, resolveProjectBlockVoices } from "./useProjectPreparation";

type Dispatch = (action: ReaderAction) => void;

export function clearReaderProjectState(dispatch: Dispatch) {
  dispatch(readerActions.setCurrentProject(null));
  dispatch(readerActions.setText(""));
  resetReaderEditingState(dispatch);
}

export function buildResolvedBlockVoices(
  blocks: PlaybackChunk[],
  blockVoices: string[],
  fallbackVoice: string,
) {
  return resolveProjectBlockVoices(blocks, blockVoices, fallbackVoice);
}

export function buildUpdatedBlockVoices(
  blocks: PlaybackChunk[],
  blockVoices: string[],
  fallbackVoice: string,
  index: number,
  voice: string,
) {
  return buildResolvedBlockVoices(blocks, blockVoices, fallbackVoice).map((currentVoice, blockIndex) =>
    blockIndex === index ? voice : currentVoice,
  );
}

export function applySplitBlocksState(dispatch: Dispatch, blockCount: number, blockVoices: string[]) {
  dispatch(readerActions.setError(null));
  dispatch(readerActions.setBlockMode(true));
  dispatch(readerActions.setWorkflowStage(getWorkflowStageForBlocks(blockCount)));
  dispatch(readerActions.selectChunk(0));
  dispatch(readerActions.setBlockVoices(blockVoices));
}

type PrepareReaderProjectArgs = Omit<ProjectPreparationInput, "blockVoices"> & {
  blockVoices: string[];
  prepareProject: (input: ProjectPreparationInput) => Promise<ProjectSnapshot | null>;
};

export async function prepareReaderProject({
  prepareProject,
  ...input
}: PrepareReaderProjectArgs) {
  return prepareProject(buildProjectPreparationInput(input));
}

type PersistVoiceAssignmentChangeArgs = Omit<PrepareReaderProjectArgs, "blockVoices"> & {
  dispatch: Dispatch;
  previousSelectedVoice: string;
  nextSelectedVoice: string;
  previousBlockVoices: string[];
  nextBlockVoices: string[];
  isBlockMode: boolean;
  setWorkflowStageToAssigning?: boolean;
  fallbackError: string;
};

export async function persistVoiceAssignmentChange({
  dispatch,
  previousSelectedVoice,
  nextSelectedVoice,
  previousBlockVoices,
  nextBlockVoices,
  isBlockMode,
  setWorkflowStageToAssigning = false,
  fallbackError,
  ...prepareArgs
}: PersistVoiceAssignmentChangeArgs) {
  if (nextSelectedVoice !== previousSelectedVoice) {
    dispatch(readerActions.setVoice(nextSelectedVoice));
  }
  dispatch(readerActions.setBlockVoices(nextBlockVoices));
  if (setWorkflowStageToAssigning) {
    dispatch(readerActions.setWorkflowStage("assigning"));
  }
  if (!isBlockMode) return null;

  try {
    return await prepareReaderProject({
      ...prepareArgs,
      blockVoices: nextBlockVoices,
    });
  } catch (error) {
    if (nextSelectedVoice !== previousSelectedVoice) {
      dispatch(readerActions.setVoice(previousSelectedVoice));
    }
    dispatch(readerActions.setBlockVoices(previousBlockVoices));
    dispatch(
      readerActions.setError(
        error instanceof Error ? error.message : fallbackError,
      ),
    );
    return null;
  }
}

type SwitchReaderProviderArgs = {
  provider: TtsProviderId;
  selectedVoice: string;
  currentProjectId: string | null;
  isBlockMode: boolean;
  text: string;
  speed: number;
  blocks: PlaybackChunk[];
  dispatch: Dispatch;
  refreshVoicesForProvider: (provider: TtsProviderId) => Promise<{ provider: TtsProviderId; default_voice: string; voices: Voice[] } | null>;
  prepareProject: (input: ProjectPreparationInput) => Promise<ProjectSnapshot | null>;
};

export async function switchReaderProvider({
  provider,
  selectedVoice,
  currentProjectId,
  isBlockMode,
  text,
  speed,
  blocks,
  dispatch,
  refreshVoicesForProvider,
  prepareProject,
}: SwitchReaderProviderArgs) {
  const previousProvider = provider === "omnivoice" ? "supertonic" : "omnivoice";
  dispatch(readerActions.setProvider(provider));
  let payload;
  try {
    payload = await refreshVoicesForProvider(provider);
  } catch (error) {
    dispatch(readerActions.setProvider(previousProvider));
    throw error;
  }
  if (!payload) {
    dispatch(readerActions.setProvider(previousProvider));
    throw new Error("Hlasy pro vybraný engine se nepodařilo načíst.");
  }

  const nextVoice = payload.voices.some((voice) => voice.name === selectedVoice)
    ? selectedVoice
    : payload.default_voice;
  const nextBlockVoices = blocks.length ? buildResolvedBlockVoices(blocks, [], nextVoice) : [];

  dispatch(readerActions.setVoice(nextVoice));
  dispatch(readerActions.setBlockVoices(nextBlockVoices));

  if (!isBlockMode || !blocks.length) return null;
  return prepareReaderProject({
    prepareProject,
    projectId: currentProjectId,
    provider,
    text,
    voice: nextVoice,
    speed,
    blocks,
    blockVoices: nextBlockVoices,
  });
}

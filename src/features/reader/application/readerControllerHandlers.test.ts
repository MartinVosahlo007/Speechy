import assert from "node:assert/strict";
import test from "node:test";
import type { PlaybackChunk } from "../domain/chunking";
import type { ReaderAction } from "./readerActions";
import {
  createInitialReaderState,
  type ReaderState,
} from "./readerReducer";
import { useReaderControllerHandlers } from "./readerControllerHandlers";

const chunks: PlaybackChunk[] = [
  { index: 0, text: "První blok", start: 0, end: 10 },
  { index: 1, text: "Druhý blok", start: 12, end: 22 },
];

function createPlaybackSession(overrides?: {
  uploadVoice?: (file: File) => Promise<string | null>;
  prepareProject?: () => Promise<null>;
}) {
  return {
    prepareProject: overrides?.prepareProject ?? (async () => null),
    onPlay: async () => {},
    onPause: () => {},
    onResume: async () => {},
    onStop: () => {},
    onEditorDoubleClick: () => {},
    onChunkClick: async () => {},
    onVoiceUpload: overrides?.uploadVoice ?? (async () => "uploaded.wav"),
  };
}

function useTestHandlers(args?: {
  state?: ReaderState;
  uploadVoice?: (file: File) => Promise<string | null>;
  prepareProject?: () => Promise<null>;
}) {
  const actions: ReaderAction[] = [];
  const state =
    args?.state ??
    createInitialReaderState({
      text: "První blok\n\nDruhý blok",
      selectedVoice: "speaker.wav",
    });

  const handlers = useReaderControllerHandlers({
    state,
    dispatch: (action) => actions.push(action),
    paragraphChunks: chunks,
    playbackSession: createPlaybackSession({
      uploadVoice: args?.uploadVoice,
      prepareProject: args?.prepareProject,
    }),
    refreshProjects: async () => {},
    clearActiveProjectState: () => {},
  });

  return { actions, handlers };
}

test('onSelectedVoiceUploadTarget("global") applies the same global voice state as manual selection', async () => {
  const { actions, handlers } = useTestHandlers();

  await handlers.onSelectedVoiceUploadTarget("global", {} as File);

  assert.deepEqual(actions, [
    { type: "error/set", payload: null },
    { type: "voice/set", payload: "uploaded.wav" },
    { type: "blockVoices/set", payload: ["uploaded.wav", "uploaded.wav"] },
  ]);
});

test("onVoiceChange in block mode rolls back when persistence fails", async () => {
  const state = {
    ...createInitialReaderState({
      text: "První blok\n\nDruhý blok",
      selectedVoice: "speaker.wav",
      currentProjectId: "project-1",
    }),
    isBlockMode: true,
    blockVoices: ["speaker.wav", "speaker.wav"],
  };
  const { actions, handlers } = useTestHandlers({
    state,
    prepareProject: async () => {
      throw new Error("Sync failed");
    },
  });

  await handlers.onVoiceChange("uploaded.wav");

  assert.deepEqual(actions, [
    { type: "voice/set", payload: "uploaded.wav" },
    { type: "blockVoices/set", payload: ["speaker.wav", "speaker.wav"] },
    { type: "voice/set", payload: "speaker.wav" },
    { type: "blockVoices/set", payload: ["speaker.wav", "speaker.wav"] },
    { type: "error/set", payload: "Sync failed" },
  ]);
});

test("onBlockVoiceChange in block mode rolls back when persistence fails", async () => {
  const state = {
    ...createInitialReaderState({
      text: "První blok\n\nDruhý blok",
      selectedVoice: "speaker.wav",
      currentProjectId: "project-1",
    }),
    isBlockMode: true,
    blockVoices: ["speaker.wav", "speaker.wav"],
  };
  const { actions, handlers } = useTestHandlers({
    state,
    prepareProject: async () => {
      throw new Error("Sync failed");
    },
  });

  await handlers.onBlockVoiceChange(1, "uploaded.wav");

  assert.deepEqual(actions, [
    { type: "blockVoices/set", payload: ["speaker.wav", "uploaded.wav"] },
    { type: "workflow/stage", payload: "assigning" },
    { type: "blockVoices/set", payload: ["speaker.wav", "speaker.wav"] },
    { type: "error/set", payload: "Sync failed" },
  ]);
});

test("onSelectedVoiceUploadTarget(number) reuses block voice upload behavior", async () => {
  const state = {
    ...createInitialReaderState({
      text: "První blok\n\nDruhý blok",
      selectedVoice: "speaker.wav",
    }),
    blockVoices: ["speaker.wav", "speaker.wav"],
  };
  const { actions, handlers } = useTestHandlers({ state });

  await handlers.onSelectedVoiceUploadTarget(1, {} as File);

  assert.deepEqual(actions, [
    { type: "error/set", payload: null },
    { type: "blockVoices/set", payload: ["speaker.wav", "uploaded.wav"] },
    { type: "workflow/stage", payload: "assigning" },
  ]);
});

test("onSelectedVoiceUploadTarget(number) rolls back when persistence fails after upload", async () => {
  const state = {
    ...createInitialReaderState({
      text: "První blok\n\nDruhý blok",
      selectedVoice: "speaker.wav",
      currentProjectId: "project-1",
    }),
    isBlockMode: true,
    blockVoices: ["speaker.wav", "speaker.wav"],
  };
  const { actions, handlers } = useTestHandlers({
    state,
    prepareProject: async () => {
      throw new Error("Sync failed");
    },
  });

  await handlers.onSelectedVoiceUploadTarget(1, {} as File);

  assert.deepEqual(actions, [
    { type: "error/set", payload: null },
    { type: "blockVoices/set", payload: ["speaker.wav", "uploaded.wav"] },
    { type: "workflow/stage", payload: "assigning" },
    { type: "blockVoices/set", payload: ["speaker.wav", "speaker.wav"] },
    { type: "error/set", payload: "Sync failed" },
  ]);
});

test("onVoiceChange outside block mode does not call persistence", async () => {
  let prepareCalls = 0;
  const { actions, handlers } = useTestHandlers({
    prepareProject: async () => {
      prepareCalls += 1;
      return null;
    },
  });

  await handlers.onVoiceChange("uploaded.wav");

  assert.equal(prepareCalls, 0);
  assert.deepEqual(actions, [
    { type: "voice/set", payload: "uploaded.wav" },
    { type: "blockVoices/set", payload: ["uploaded.wav", "uploaded.wav"] },
  ]);
});

test("onSelectedVoiceUploadTarget does not dispatch voice changes when upload returns null", async () => {
  const { actions, handlers } = useTestHandlers({
    uploadVoice: async () => null,
  });

  await handlers.onSelectedVoiceUploadTarget("global", {} as File);

  assert.deepEqual(actions, [{ type: "error/set", payload: null }]);
});

test('onSelectedVoiceUploadTarget("global") rolls back in block mode when persistence fails', async () => {
  const state = {
    ...createInitialReaderState({
      text: "První blok\n\nDruhý blok",
      selectedVoice: "speaker.wav",
      currentProjectId: "project-1",
    }),
    isBlockMode: true,
    blockVoices: ["speaker.wav", "speaker.wav"],
  };
  const { actions, handlers } = useTestHandlers({
    state,
    prepareProject: async () => {
      throw new Error("Sync failed");
    },
  });

  await handlers.onSelectedVoiceUploadTarget("global", {} as File);

  assert.deepEqual(actions, [
    { type: "error/set", payload: null },
    { type: "voice/set", payload: "uploaded.wav" },
    { type: "blockVoices/set", payload: ["speaker.wav", "speaker.wav"] },
    { type: "voice/set", payload: "speaker.wav" },
    { type: "blockVoices/set", payload: ["speaker.wav", "speaker.wav"] },
    { type: "error/set", payload: "Sync failed" },
  ]);
});

test("onSelectedVoiceUploadTarget dispatches the existing upload error fallback when upload throws", async () => {
  const { actions, handlers } = useTestHandlers({
    uploadVoice: async () => {
      throw new Error("Boom");
    },
  });

  await handlers.onSelectedVoiceUploadTarget("global", {} as File);

  assert.deepEqual(actions, [
    { type: "error/set", payload: null },
    { type: "error/set", payload: "Boom" },
  ]);
});

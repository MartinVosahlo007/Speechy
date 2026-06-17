import test from "node:test";
import assert from "node:assert/strict";
import type { ProjectSnapshot } from "../domain/types";
import { getProjectPollSignature } from "./useProjectPolling";

function makeProject(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    id: "proj-1",
    title: "Test",
    text: "hello",
    language: "cs",
    pinned: false,
    selected_provider: "omnivoice",
    selected_voice: "speaker.wav",
    settings: { speed: 1 },
    status: "running",
    progress: { done: 0, total: 2 },
    blocks: [
      {
        index: 0,
        text: "a",
        voice: "speaker.wav",
        cache_key: "k0",
        status: "queued",
        error: null,
        audio_ready: false,
        duration_ms: null,
        start_ms: 0,
        end_ms: 0,
      },
      {
        index: 1,
        text: "b",
        voice: "speaker2.wav",
        cache_key: "k1",
        status: "queued",
        error: null,
        audio_ready: false,
        duration_ms: null,
        start_ms: 0,
        end_ms: 0,
      },
    ],
    download_ready: false,
    ...overrides,
  };
}

test("getProjectPollSignature changes when block status or audio_ready changes", () => {
  const base = makeProject();
  const same = makeProject();
  assert.equal(getProjectPollSignature(base), getProjectPollSignature(same));

  const blockDone = makeProject({
    blocks: [
      { ...base.blocks[0], status: "done", audio_ready: true },
      base.blocks[1],
    ],
    progress: { done: 1, total: 2 },
  });
  assert.notEqual(getProjectPollSignature(base), getProjectPollSignature(blockDone));
});

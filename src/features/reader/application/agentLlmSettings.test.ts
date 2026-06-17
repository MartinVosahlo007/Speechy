import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_AGENT_LLM_SETTINGS,
  resolveActiveOpenRouterModel,
  resolveAgentLlmSettings,
  setAgentLlmProvider,
  setSelectedOpenRouterModel,
} from "./agentLlmSettings";

test("provider isolation keeps OpenRouter model when switching providers", () => {
  let state = resolveAgentLlmSettings(null);
  state = setSelectedOpenRouterModel(state, "openai/gpt-4o");
  state = setAgentLlmProvider(state, "minimax");
  assert.equal(state.selectedLlmProvider, "minimax");
  assert.equal(state.selectedOpenRouterModel, "openai/gpt-4o");

  state = setAgentLlmProvider(state, "openrouter");
  assert.equal(state.selectedOpenRouterModel, "openai/gpt-4o");
});

test("changing OpenRouter model does not affect provider", () => {
  let state = resolveAgentLlmSettings({
    selectedLlmProvider: "openrouter",
    selectedOpenRouterModel: "model/a",
  });
  state = setSelectedOpenRouterModel(state, "model/b");
  assert.equal(state.selectedLlmProvider, "openrouter");
  assert.equal(state.selectedOpenRouterModel, "model/b");
});

test("resolveActiveOpenRouterModel uses fallback when empty", () => {
  const state = DEFAULT_AGENT_LLM_SETTINGS;
  assert.equal(resolveActiveOpenRouterModel(state, "fallback/model"), "fallback/model");
  assert.equal(
    resolveActiveOpenRouterModel(
      { ...state, selectedOpenRouterModel: "selected/model" },
      "fallback/model",
    ),
    "selected/model",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  filterOpenRouterModels,
  formatContextLength,
  formatUsdPerMillion,
  normalizeOpenRouterModel,
  parsePrice,
  sortOpenRouterModels,
  toPricePerMillion,
} from "./openRouterModelCatalog";
import type { NormalizedOpenRouterModel } from "./agentLlmTypes";

const sampleRaw = {
  id: "openai/gpt-4o",
  name: "GPT-4o",
  context_length: 128000,
  pricing: { prompt: "0.000005", completion: "0.000015" },
  architecture: {
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
  },
  top_provider: { max_completion_tokens: 4096, context_length: 120000 },
  supported_parameters: ["tools", "structured_outputs", "reasoning"],
};

test("parsePrice handles valid and invalid values", () => {
  assert.equal(parsePrice("0.000005"), 0.000005);
  assert.equal(parsePrice(0), 0);
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("invalid"), null);
});

test("toPricePerMillion converts per-token price", () => {
  assert.equal(toPricePerMillion(0.000005), 5);
  assert.equal(toPricePerMillion(null), null);
});

test("normalizeOpenRouterModel reads metadata and capabilities", () => {
  const model = normalizeOpenRouterModel(sampleRaw);
  assert.ok(model);
  assert.equal(model.id, "openai/gpt-4o");
  assert.equal(model.name, "GPT-4o");
  assert.equal(model.contextLength, 128000);
  assert.equal(model.maxCompletionTokens, 4096);
  assert.deepEqual(model.inputModalities, ["text", "image"]);
  assert.deepEqual(model.outputModalities, ["text"]);
  assert.equal(model.supportsTools, true);
  assert.equal(model.supportsStructuredOutputs, true);
  assert.equal(model.supportsReasoning, true);
});

test("normalizeOpenRouterModel maps pricing and isFree", () => {
  const paid = normalizeOpenRouterModel(sampleRaw);
  assert.equal(paid?.inputPricePerMillion, 5);
  assert.equal(paid?.outputPricePerMillion, 15);
  assert.equal(paid?.isFree, false);

  const free = normalizeOpenRouterModel({
    id: "free/model",
    pricing: { prompt: 0, completion: "0" },
  });
  assert.equal(free?.isFree, true);

  const unknown = normalizeOpenRouterModel({
    id: "unknown/model",
    pricing: {},
  });
  assert.equal(unknown?.isFree, false);
  assert.equal(unknown?.inputPricePerMillion, null);
});

test("formatContextLength and formatUsdPerMillion", () => {
  assert.equal(formatContextLength(128000), "128K");
  assert.equal(formatContextLength(1_500_000), "1.5M");
  assert.equal(formatUsdPerMillion(0), "free");
  assert.equal(formatUsdPerMillion(null), "unknown");
});

function buildModel(overrides: Partial<NormalizedOpenRouterModel>): NormalizedOpenRouterModel {
  return {
    id: "a/model",
    name: "Alpha",
    provider: "openrouter",
    contextLength: 1000,
    providerContextLength: null,
    maxCompletionTokens: null,
    inputPricePerToken: 0.000001,
    outputPricePerToken: 0.000002,
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    isFree: false,
    inputModalities: ["text"],
    outputModalities: ["text"],
    supportedParameters: [],
    supportsTools: false,
    supportsStructuredOutputs: false,
    supportsReasoning: false,
    ...overrides,
  };
}

test("filterOpenRouterModels supports search and price filters", () => {
  const models = [
    buildModel({ id: "openai/gpt-4o", name: "GPT-4o", inputPricePerMillion: 5, outputPricePerMillion: 15 }),
    buildModel({ id: "free/model", name: "Free Model", isFree: true, inputPricePerMillion: 0, outputPricePerMillion: 0 }),
    buildModel({ id: "cheap/model", name: "Cheap", inputPricePerMillion: 0.5, outputPricePerMillion: 1 }),
  ];

  assert.equal(
    filterOpenRouterModels(models, { search: "gpt" }).length,
    1,
  );
  assert.equal(
    filterOpenRouterModels(models, { freeOnly: true }).length,
    1,
  );
  assert.equal(
    filterOpenRouterModels(models, { maxInputPricePerMillion: 1 }).length,
    2,
  );
  assert.equal(
    filterOpenRouterModels(models, { maxOutputPricePerMillion: 2 }).length,
    2,
  );
});

test("sortOpenRouterModels sorts by context length", () => {
  const models = [
    buildModel({ id: "a", name: "A", contextLength: 1000 }),
    buildModel({ id: "b", name: "B", contextLength: 5000 }),
  ];
  const sorted = sortOpenRouterModels(models, "contextLength", "desc");
  assert.equal(sorted[0]?.id, "b");
});

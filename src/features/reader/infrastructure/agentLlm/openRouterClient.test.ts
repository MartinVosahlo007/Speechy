import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchOpenRouterChatCompletion,
  fetchOpenRouterModelsRaw,
  mapOpenRouterHttpError,
} from "./openRouterClient";

test("mapOpenRouterHttpError maps status codes", () => {
  assert.match(mapOpenRouterHttpError(401, ""), /API klíč/i);
  assert.match(mapOpenRouterHttpError(402, "billing"), /kredit/i);
  assert.match(mapOpenRouterHttpError(404, "model not found"), /model/i);
  assert.match(mapOpenRouterHttpError(429, ""), /rate limit/i);
  assert.match(mapOpenRouterHttpError(500, ""), /provideru/i);
});

test("fetchOpenRouterChatCompletion sends expected request shape", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "Ahoj" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const content = await fetchOpenRouterChatCompletion({
      apiKey: "sk-or-test-key",
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
      temperature: 0.2,
      maxTokens: 4000,
    });
    assert.equal(content, "Ahoj");
    assert.equal(calls.length, 1);
    assert.match(calls[0]?.url ?? "", /\/api\/v1\/chat\/completions$/);
    const headers = calls[0]?.init.headers as Record<string, string>;
    assert.match(headers.Authorization, /Bearer sk-or-test-key/);
    const body = JSON.parse(String(calls[0]?.init.body));
    assert.equal(body.model, "openai/gpt-4o");
    assert.equal(body.stream, false);
    assert.equal(body.temperature, 0.2);
    assert.equal(body.max_tokens, 4000);
    assert.equal(Array.isArray(body.messages), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchOpenRouterModelsRaw requests models endpoint", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url) => {
    assert.match(String(url), /\/api\/v1\/models$/);
    return new Response(
      JSON.stringify({ data: [{ id: "openai/gpt-4o", name: "GPT-4o" }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const models = await fetchOpenRouterModelsRaw("sk-or-test-key");
    assert.equal(models.length, 1);
    assert.equal(models[0]?.id, "openai/gpt-4o");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

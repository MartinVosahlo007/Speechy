import assert from "node:assert/strict";
import test from "node:test";
import {
  looksLikeOpenRouterKey,
  maskApiKey,
  normalizeOpenRouterApiKey,
} from "./openRouterApiKey";

test("normalizeOpenRouterApiKey removes Bearer prefix", () => {
  assert.equal(
    normalizeOpenRouterApiKey("Bearer sk-or-test-key-123"),
    "sk-or-test-key-123",
  );
});

test("normalizeOpenRouterApiKey removes Authorization prefix", () => {
  assert.equal(
    normalizeOpenRouterApiKey("Authorization: sk-or-test-key-123"),
    "sk-or-test-key-123",
  );
});

test("normalizeOpenRouterApiKey removes quotes and whitespace", () => {
  assert.equal(
    normalizeOpenRouterApiKey('  "sk-or-test key"  '),
    "sk-or-testkey",
  );
});

test("looksLikeOpenRouterKey validates sk-or prefix", () => {
  assert.equal(looksLikeOpenRouterKey("sk-or-abc123"), true);
  assert.equal(looksLikeOpenRouterKey("sk-abc123"), false);
  assert.equal(looksLikeOpenRouterKey(""), false);
});

test("maskApiKey never returns full key", () => {
  const key = "sk-or-abcdefghijklmnopqrstuvwxyz";
  const masked = maskApiKey(key);
  assert.notEqual(masked, key);
  assert.match(masked, /^sk-or-/);
  assert.match(masked, /…/);
});

test("maskApiKey returns not set for empty key", () => {
  assert.equal(maskApiKey(""), "not set");
  assert.equal(maskApiKey(null), "not set");
});

import assert from "node:assert/strict";
import test from "node:test";
import type { AgentChatResponse } from "./agentChatCommand";
import {
  buildAgentHistory,
  buildAgentUserContent,
  buildAssistantPanelMessage,
  createPanelMessageId,
  markAgentMessageApplied,
  validateAgentAttachmentSize,
  type AgentPanelMessage,
} from "./agentChatPanelState";

test("buildAgentUserContent returns trimmed input without attachment", () => {
  assert.equal(buildAgentUserContent("  Ahoj  ", null), "Ahoj");
});

test("buildAgentUserContent returns attachment content without input", () => {
  assert.equal(
    buildAgentUserContent("", { name: "note.txt", content: "Obsah" }),
    "[Příloha: note.txt]\n\nObsah",
  );
});

test("buildAgentUserContent combines trimmed input and attachment", () => {
  assert.equal(
    buildAgentUserContent("  Ahoj  ", { name: "note.txt", content: "Obsah" }),
    "Ahoj\n\n[Příloha: note.txt]\n\nObsah",
  );
});

test("buildAgentUserContent ignores whitespace-only input when attachment exists", () => {
  assert.equal(
    buildAgentUserContent("   ", { name: "note.txt", content: "Obsah" }),
    "[Příloha: note.txt]\n\nObsah",
  );
});

test("validateAgentAttachmentSize accepts sizes within the limit", () => {
  assert.equal(validateAgentAttachmentSize(200_000), null);
});

test("validateAgentAttachmentSize returns the exact limit error for oversize attachments", () => {
  assert.equal(
    validateAgentAttachmentSize(200_001),
    "Příloha je příliš velká (max 200 kB).",
  );
});

test("buildAssistantPanelMessage prefers explicit message content", () => {
  const response: AgentChatResponse = {
    message: "Hotovo",
    blocks: [{ text: "Blok", voice: "speaker.wav" }],
  };

  assert.deepEqual(buildAssistantPanelMessage(response, () => "msg-1"), {
    id: "msg-1",
    role: "assistant",
    content: "Hotovo",
    blocks: [{ text: "Blok", voice: "speaker.wav" }],
  });
});

test("buildAssistantPanelMessage uses fallback text when blocks exist without a message", () => {
  const response: AgentChatResponse = {
    message: "",
    blocks: [{ text: "Blok", voice: "speaker.wav" }],
  };

  assert.equal(
    buildAssistantPanelMessage(response, () => "msg-1").content,
    "(Připravil jsem scénář — viz níže.)",
  );
});

test("buildAssistantPanelMessage keeps empty content when no message or blocks are returned", () => {
  const response: AgentChatResponse = {
    message: "",
    blocks: null,
  };

  assert.equal(buildAssistantPanelMessage(response, () => "msg-1").content, "");
});

test("markAgentMessageApplied marks only the targeted message", () => {
  const messages: AgentPanelMessage[] = [
    { id: "one", role: "user", content: "A" },
    { id: "two", role: "assistant", content: "B", applied: false },
  ];

  assert.deepEqual(markAgentMessageApplied(messages, "two"), [
    { id: "one", role: "user", content: "A" },
    { id: "two", role: "assistant", content: "B", applied: true },
  ]);
});

test("buildAgentHistory strips panel-only fields from message history", () => {
  const messages: AgentPanelMessage[] = [
    {
      id: "assistant-1",
      role: "assistant",
      content: "Scénář",
      blocks: [{ text: "Blok", voice: "speaker.wav" }],
      applied: true,
    },
  ];
  const userMessage: AgentPanelMessage = {
    id: "user-1",
    role: "user",
    content: "Ahoj",
  };

  assert.deepEqual(buildAgentHistory(messages, userMessage), [
    { role: "assistant", content: "Scénář" },
    { role: "user", content: "Ahoj" },
  ]);
});

test("createPanelMessageId returns a non-empty string id", () => {
  assert.equal(typeof createPanelMessageId(), "string");
  assert.ok(createPanelMessageId().length > 0);
});

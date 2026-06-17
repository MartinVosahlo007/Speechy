import type {
  AgentChatMessage,
  AgentChatResponse,
  AgentScriptBlock,
} from "./agentChatCommand";

export type AgentAttachment = { name: string; content: string };

export type AgentPanelMessage = AgentChatMessage & {
  id: string;
  blocks?: AgentScriptBlock[] | null;
  applied?: boolean;
};

export const MAX_AGENT_ATTACHMENT_BYTES = 200_000;

export function buildAgentUserContent(
  input: string,
  attachment: AgentAttachment | null,
): string {
  const parts: string[] = [];
  if (input.trim()) parts.push(input.trim());
  if (attachment) {
    parts.push(`[Příloha: ${attachment.name}]\n\n${attachment.content}`);
  }
  return parts.join("\n\n");
}

export function buildAgentHistory(
  messages: AgentPanelMessage[],
  userMessage: AgentPanelMessage,
): AgentChatMessage[] {
  return [...messages, userMessage].map(({ role, content }) => ({ role, content }));
}

export function buildAssistantPanelMessage(
  response: AgentChatResponse,
  nextId: () => string,
): AgentPanelMessage {
  return {
    id: nextId(),
    role: "assistant",
    content:
      response.message ||
      (response.blocks ? "(Připravil jsem scénář — viz níže.)" : ""),
    blocks: response.blocks,
  };
}

export function markAgentMessageApplied(
  messages: AgentPanelMessage[],
  messageId: string,
): AgentPanelMessage[] {
  return messages.map((message) =>
    message.id === messageId ? { ...message, applied: true } : message,
  );
}

export function validateAgentAttachmentSize(size: number): string | null {
  if (size <= MAX_AGENT_ATTACHMENT_BYTES) return null;
  return `Příloha je příliš velká (max ${Math.floor(MAX_AGENT_ATTACHMENT_BYTES / 1000)} kB).`;
}

export function createPanelMessageId(): string {
  return Math.random().toString(36).slice(2, 10);
}

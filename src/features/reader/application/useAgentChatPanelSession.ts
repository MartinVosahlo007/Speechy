import { useState } from "react";
import type {
  AgentChatMessage,
  AgentChatResponse,
  AgentScriptBlock,
} from "./agentChatCommand";
import {
  buildAgentHistory,
  buildAgentUserContent,
  buildAssistantPanelMessage,
  createPanelMessageId,
  markAgentMessageApplied,
  type AgentAttachment,
  type AgentPanelMessage,
  validateAgentAttachmentSize,
} from "./agentChatPanelState";
import { readTextAttachment } from "../infrastructure/textAttachmentReader";

type UseAgentChatPanelSessionArgs = {
  onSend: (messages: AgentChatMessage[]) => Promise<AgentChatResponse>;
  onApplyScript: (
    blocks: AgentScriptBlock[],
  ) => Promise<{ ok: boolean; error?: string }>;
};

export function useAgentChatPanelSession({
  onSend,
  onApplyScript,
}: UseAgentChatPanelSessionArgs) {
  const [messages, setMessages] = useState<AgentPanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<AgentAttachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSend = !busy && Boolean(buildAgentUserContent(input, attachment));

  async function pickAttachment(file: File) {
    const sizeError = validateAgentAttachmentSize(file.size);
    if (sizeError) {
      setError(sizeError);
      return;
    }

    try {
      const content = await readTextAttachment(file);
      setAttachment({ name: file.name, content });
      setError(null);
    } catch {
      setError("Přílohu se nepodařilo přečíst.");
    }
  }

  async function send() {
    const userContent = buildAgentUserContent(input, attachment);
    if (!userContent || busy) return;

    const userMessage: AgentPanelMessage = {
      id: createPanelMessageId(),
      role: "user",
      content: userContent,
    };
    const history = buildAgentHistory(messages, userMessage);

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setAttachment(null);
    setBusy(true);
    setError(null);

    try {
      const response = await onSend(history);
      const assistantMessage = buildAssistantPanelMessage(
        response,
        createPanelMessageId,
      );
      setMessages((current) => [...current, assistantMessage]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Agent selhal.");
    } finally {
      setBusy(false);
    }
  }

  async function apply(messageId: string, blocks: AgentScriptBlock[]) {
    setBusy(true);
    setError(null);

    try {
      const result = await onApplyScript(blocks);
      if (!result.ok) {
        setError(result.error ?? "Aplikace scénáře selhala.");
        return;
      }
      setMessages((current) => markAgentMessageApplied(current, messageId));
    } finally {
      setBusy(false);
    }
  }

  return {
    messages,
    input,
    attachment,
    busy,
    error,
    canSend,
    setInput,
    clearAttachment: () => setAttachment(null),
    pickAttachment,
    send,
    apply,
  };
}

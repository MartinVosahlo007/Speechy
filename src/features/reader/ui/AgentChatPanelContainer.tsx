"use client";

import { useCallback, useEffect } from "react";
import { debugSessionLog } from "../application/debugSessionLog";
import type { AgentChatMessage, AgentChatResponse, SendAgentChatOptions } from "../application/agentChatCommand";
import type { AgentScriptBlock } from "../domain/agentLlmTypes";
import { useAgentChatPanelSession } from "../application/useAgentChatPanelSession";
import { useAgentLlmSettings } from "../application/useAgentLlmSettings";
import { AgentChatPanel } from "./AgentChatPanel";

type AgentChatPanelContainerProps = {
  onClose: () => void;
  onAgentSend: (
    messages: AgentChatMessage[],
    options: SendAgentChatOptions,
  ) => Promise<AgentChatResponse>;
  onAgentApplyScript: (
    blocks: AgentScriptBlock[],
  ) => Promise<{ ok: boolean; error?: string }>;
};

export function AgentChatPanelContainer({
  onClose,
  onAgentSend,
  onAgentApplyScript,
}: AgentChatPanelContainerProps) {
  useEffect(() => {
    debugSessionLog({
      location: "AgentChatPanelContainer.tsx",
      message: "agent container mounted",
      data: {},
      hypothesisId: "FACT-A1",
    });
    return () => {
      debugSessionLog({
        location: "AgentChatPanelContainer.tsx",
        message: "agent container unmounted",
        data: {},
        hypothesisId: "FACT-A1",
      });
    };
  }, []);

  const agentLlm = useAgentLlmSettings();
  const { loadModels } = agentLlm;
  const onOpenRouterModelsOpen = useCallback(
    () => void loadModels(false),
    [loadModels],
  );
  const onOpenRouterModelsRefresh = useCallback(
    () => void loadModels(true),
    [loadModels],
  );
  const agentChatSession = useAgentChatPanelSession({
    onSend: (messages) =>
      onAgentSend(messages, {
        provider: agentLlm.settings.selectedLlmProvider,
        openRouterModel: agentLlm.activeOpenRouterModel,
      }),
    onApplyScript: onAgentApplyScript,
  });

  return (
    <AgentChatPanel
      open
      onClose={onClose}
      messages={agentChatSession.messages}
      input={agentChatSession.input}
      attachment={agentChatSession.attachment}
      busy={agentChatSession.busy}
      error={agentChatSession.error}
      canSend={agentChatSession.canSend}
      selectedProvider={agentLlm.settings.selectedLlmProvider}
      selectedOpenRouterModel={agentLlm.activeOpenRouterModel}
      providerStatus={agentLlm.providerStatus}
      providerStatusError={agentLlm.statusError}
      openRouterModels={agentLlm.models}
      openRouterModelsLoading={agentLlm.modelsLoading}
      openRouterModelsStale={agentLlm.modelsStale}
      openRouterModelsWarning={agentLlm.modelsWarning}
      openRouterModelsError={agentLlm.modelsError}
      onInputChange={agentChatSession.setInput}
      onSend={agentChatSession.send}
      onApply={agentChatSession.apply}
      onAttachmentPick={agentChatSession.pickAttachment}
      onAttachmentClear={agentChatSession.clearAttachment}
      onProviderChange={agentLlm.setProvider}
      onOpenRouterModelChange={agentLlm.setOpenRouterModel}
      onOpenRouterModelsOpen={onOpenRouterModelsOpen}
      onOpenRouterModelsRefresh={onOpenRouterModelsRefresh}
    />
  );
}

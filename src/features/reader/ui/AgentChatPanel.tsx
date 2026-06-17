import { useEffect, useRef } from "react";
import { Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import type { AgentScriptBlock } from "../application/agentChatCommand";
import type { AgentAttachment, AgentPanelMessage } from "../application/agentChatPanelState";
import type { AgentLlmProviderId, AgentLlmProviderStatus, NormalizedOpenRouterModel } from "../domain/agentLlmTypes";
import { AgentLlmProviderPicker } from "./AgentLlmProviderPicker";
import { OpenRouterModelPicker } from "./OpenRouterModelPicker";

type AgentChatPanelProps = {
  open: boolean;
  onClose: () => void;
  messages: AgentPanelMessage[];
  input: string;
  attachment: AgentAttachment | null;
  busy: boolean;
  error: string | null;
  canSend: boolean;
  selectedProvider: AgentLlmProviderId;
  selectedOpenRouterModel: string;
  providerStatus: AgentLlmProviderStatus | null;
  providerStatusError: string | null;
  openRouterModels: NormalizedOpenRouterModel[];
  openRouterModelsLoading: boolean;
  openRouterModelsStale: boolean;
  openRouterModelsWarning: string | null;
  openRouterModelsError: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  onApply: (messageId: string, blocks: AgentScriptBlock[]) => void | Promise<void>;
  onAttachmentPick: (file: File) => void | Promise<void>;
  onAttachmentClear: () => void;
  onProviderChange: (provider: AgentLlmProviderId) => void;
  onOpenRouterModelChange: (modelId: string) => void;
  onOpenRouterModelsOpen: () => void;
  onOpenRouterModelsRefresh: () => void;
};

export function AgentChatPanel({
  open,
  onClose,
  messages,
  input,
  attachment,
  busy,
  error,
  canSend,
  selectedProvider,
  selectedOpenRouterModel,
  providerStatus,
  providerStatusError,
  openRouterModels,
  openRouterModelsLoading,
  openRouterModelsStale,
  openRouterModelsWarning,
  openRouterModelsError,
  onInputChange,
  onSend,
  onApply,
  onAttachmentPick,
  onAttachmentClear,
  onProviderChange,
  onOpenRouterModelChange,
  onOpenRouterModelsOpen,
  onOpenRouterModelsRefresh,
}: AgentChatPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">Agent</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-black"
            aria-label="Zavřít"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          <AgentLlmProviderPicker
            selectedProvider={selectedProvider}
            providerStatus={providerStatus}
            disabled={busy}
            onProviderChange={onProviderChange}
          />
          {selectedProvider === "openrouter" ? (
            <OpenRouterModelPicker
              selectedModel={selectedOpenRouterModel}
              models={openRouterModels}
              loading={openRouterModelsLoading}
              stale={openRouterModelsStale}
              warning={openRouterModelsWarning}
              error={openRouterModelsError}
              disabled={busy}
              onOpen={onOpenRouterModelsOpen}
              onSelect={onOpenRouterModelChange}
              onRefresh={onOpenRouterModelsRefresh}
            />
          ) : null}
          {providerStatusError ? (
            <div className="text-[10px] text-amber-600">{providerStatusError}</div>
          ) : null}
          {providerStatus && !providerStatus.openrouter.configured ? (
            <div className="text-[10px] text-gray-500">
              OpenRouter vyžaduje platný <code className="text-[9px]">OPENROUTER_API_KEY</code> v
              serverovém <code className="text-[9px]">.env</code> (prefix <code className="text-[9px]">sk-or-</code>).
            </div>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-500">
            Napiš agentovi co potřebuješ — třeba „napiš scénář o dvou kamarádech a vyber pro
            ně hlasy z knihovny", nebo přilož svůj text a nech ho rozdělit.
          </div>
        ) : null}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            <div
              className={
                msg.role === "user"
                  ? "ml-6 rounded-md bg-black px-3 py-2 text-sm text-white"
                  : "mr-6 rounded-md bg-gray-50 px-3 py-2 text-sm text-black"
              }
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
            {msg.role === "assistant" && msg.blocks && msg.blocks.length > 0 ? (
              <div className="mr-6 rounded-md border border-gray-200 bg-white p-3 text-xs">
                <div className="mb-2 font-medium uppercase tracking-[0.15em] text-gray-500">Scénář ({msg.blocks.length} {msg.blocks.length === 1 ? "blok" : "bloků"})</div>
                <ol className="mb-3 space-y-1 text-gray-700">
                  {msg.blocks.slice(0, 6).map((block, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="shrink-0 text-gray-400">{block.voice}</span>
                      <span className="line-clamp-1 flex-1 text-gray-800">{block.text}</span>
                    </li>
                  ))}
                  {msg.blocks.length > 6 ? (
                    <li className="text-gray-400">…a další {msg.blocks.length - 6}</li>
                  ) : null}
                </ol>
                <button
                  type="button"
                  onClick={() => void onApply(msg.id, msg.blocks!)}
                  disabled={busy || msg.applied}
                  className="w-full rounded-md bg-black px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {msg.applied ? "Vytvořeno v projektu" : "Vytvořit projekt"}
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {busy ? (
          <div className="mr-6 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Agent přemýšlí…
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="border-t border-gray-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          {error}
        </div>
      ) : null}

      {attachment ? (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-xs text-gray-600">
          <span className="truncate">
            <Paperclip className="mr-1 inline h-3 w-3" />
            {attachment.name}
          </span>
          <button
            type="button"
            onClick={onAttachmentClear}
            className="text-gray-400 transition-colors hover:text-black"
            aria-label="Odebrat přílohu"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-black disabled:opacity-40"
            aria-label="Přiložit soubor"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void onSend();
              }
            }}
            disabled={busy}
            placeholder="Napiš agentovi…"
            rows={2}
            className="flex-1 resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={!canSend}
            className="rounded-md bg-black p-2 text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Odeslat"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onAttachmentPick(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

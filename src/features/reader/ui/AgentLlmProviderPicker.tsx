import type { AgentLlmProviderId, AgentLlmProviderStatus } from "../domain/agentLlmTypes";

const PROVIDER_LABELS: Record<AgentLlmProviderId, string> = {
  minimax: "MiniMax",
  openrouter: "OpenRouter",
};

export function AgentLlmProviderPicker({
  selectedProvider,
  providerStatus,
  disabled,
  onProviderChange,
}: {
  selectedProvider: AgentLlmProviderId;
  providerStatus: AgentLlmProviderStatus | null;
  disabled?: boolean;
  onProviderChange: (provider: AgentLlmProviderId) => void;
}) {
  const providers: AgentLlmProviderId[] = ["minimax", "openrouter"];

  return (
    <div className="flex flex-wrap gap-1">
      {providers.map((provider) => {
        const configured =
          provider === "minimax"
            ? providerStatus?.minimax.configured ?? true
            : providerStatus?.openrouter.configured ?? false;
        const active = selectedProvider === provider;
        return (
          <button
            key={provider}
            type="button"
            disabled={disabled || !configured}
            onClick={() => onProviderChange(provider)}
            title={
              configured
                ? PROVIDER_LABELS[provider]
                : `${PROVIDER_LABELS[provider]} není nakonfigurovaný na serveru`
            }
            className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors ${
              active
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            }`}
          >
            {PROVIDER_LABELS[provider]}
          </button>
        );
      })}
    </div>
  );
}

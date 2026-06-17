import type { AgentLlmSettingsState } from "../domain/agentLlmTypes";

const KEY = "speechyAgentLlmState";

export function loadAgentLlmSettings(): Partial<AgentLlmSettingsState> | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<AgentLlmSettingsState>;
  } catch {
    return null;
  }
}

export function saveAgentLlmSettings(settings: AgentLlmSettingsState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(settings));
}

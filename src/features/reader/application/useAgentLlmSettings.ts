import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentLlmProviderId,
  AgentLlmProviderStatus,
  NormalizedOpenRouterModel,
} from "../domain/agentLlmTypes";
import {
  fetchAgentLlmProviderStatus,
  fetchOpenRouterModels,
} from "../infrastructure/agentChatApi";
import {
  loadAgentLlmSettings,
  saveAgentLlmSettings,
} from "../infrastructure/agentLlmSettingsStore";
import { debugSessionLog } from "./debugSessionLog";
import {
  DEFAULT_AGENT_LLM_SETTINGS,
  resolveActiveOpenRouterModel,
  resolveAgentLlmSettings,
  setAgentLlmProvider,
  setSelectedOpenRouterModel,
  type AgentLlmSettingsState,
} from "./agentLlmSettings";

export function useAgentLlmSettings() {
  const [settings, setSettings] = useState<AgentLlmSettingsState>(DEFAULT_AGENT_LLM_SETTINGS);
  const [providerStatus, setProviderStatus] = useState<AgentLlmProviderStatus | null>(null);
  const [models, setModels] = useState<NormalizedOpenRouterModel[]>([]);
  const [modelsStale, setModelsStale] = useState(false);
  const [modelsWarning, setModelsWarning] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const modelsRef = useRef(models);
  modelsRef.current = models;

  useEffect(() => {
    const stored = loadAgentLlmSettings();
    setSettings(resolveAgentLlmSettings(stored));
  }, []);

  useEffect(() => {
    saveAgentLlmSettings(settings);
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchAgentLlmProviderStatus();
        if (cancelled) return;
        setProviderStatus(status);
        setStatusError(null);
        setSettings((current) =>
          resolveAgentLlmSettings(current, {
            ...current,
            selectedLlmProvider:
              current.selectedLlmProvider === "openrouter" && !status.openrouter.configured
                ? status.defaultProvider
                : current.selectedLlmProvider === "minimax" && !status.minimax.configured
                  ? status.defaultProvider
                  : current.selectedLlmProvider,
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setStatusError(err instanceof Error ? err.message : "Stav providerů nelze načíst.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadModels = useCallback(async (forceRefresh = false) => {
    const cachedCount = modelsRef.current.length;
    if (!forceRefresh && cachedCount > 0) {
      debugSessionLog({
        location: "useAgentLlmSettings.ts:loadModels",
        message: "loadModels skipped — cache already populated",
        data: { cachedCount },
        hypothesisId: "FACT-M1",
      });
      return;
    }
    debugSessionLog({
      location: "useAgentLlmSettings.ts:loadModels",
      message: "loadModels invoked",
      data: { forceRefresh },
      hypothesisId: "FACT-M1",
    });
    setModelsLoading(true);
    setModelsError(null);
    try {
      const result = await fetchOpenRouterModels(forceRefresh);
      setModels(result.models);
      debugSessionLog({
        location: "useAgentLlmSettings.ts:loadModels",
        message: "loadModels finished",
        data: { modelCount: result.models.length, stale: Boolean(result.stale) },
        hypothesisId: "FACT-M1",
      });
      setModelsStale(Boolean(result.stale));
      setModelsWarning(result.warning ?? null);
      setSettings((current) => {
        if (current.selectedOpenRouterModel) return current;
        const firstModel = result.models[0]?.id;
        return firstModel ? setSelectedOpenRouterModel(current, firstModel) : current;
      });
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : "Modely nelze načíst.");
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const setProvider = useCallback((provider: AgentLlmProviderId) => {
    if (
      provider === "openrouter" &&
      providerStatus &&
      !providerStatus.openrouter.configured
    ) {
      return;
    }
    setSettings((current) => setAgentLlmProvider(current, provider));
  }, [providerStatus]);

  const setOpenRouterModel = useCallback((model: string) => {
    setSettings((current) => setSelectedOpenRouterModel(current, model));
  }, []);

  const activeOpenRouterModel = useMemo(
    () => resolveActiveOpenRouterModel(settings, models[0]?.id ?? ""),
    [models, settings],
  );

  return {
    settings,
    providerStatus,
    statusError,
    models,
    modelsStale,
    modelsWarning,
    modelsLoading,
    modelsError,
    activeOpenRouterModel,
    setProvider,
    setOpenRouterModel,
    loadModels,
  };
}

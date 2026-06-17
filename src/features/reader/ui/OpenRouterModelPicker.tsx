"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";
import type { NormalizedOpenRouterModel, OpenRouterModelSortKey } from "../domain/agentLlmTypes";
import {
  filterOpenRouterModels,
  formatContextLength,
  formatUsdPerMillion,
  sortOpenRouterModels,
} from "../domain/openRouterModelCatalog";

function ModelBadges({ model }: { model: NormalizedOpenRouterModel }) {
  const badges: string[] = [];
  if (model.supportsTools) badges.push("Tools");
  if (model.supportsStructuredOutputs) badges.push("Structured");
  if (model.supportsReasoning) badges.push("Reasoning");
  for (const modality of model.inputModalities) {
    badges.push(`in:${modality}`);
  }
  for (const modality of model.outputModalities) {
    badges.push(`out:${modality}`);
  }
  if (!badges.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {badges.map((badge) => (
        <span
          key={badge}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-gray-500"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

export function OpenRouterModelPicker({
  selectedModel,
  models,
  loading,
  stale,
  warning,
  error,
  disabled,
  onOpen,
  onSelect,
  onRefresh,
}: {
  selectedModel: string;
  models: NormalizedOpenRouterModel[];
  loading: boolean;
  stale?: boolean;
  warning?: string | null;
  error?: string | null;
  disabled?: boolean;
  onOpen: () => void;
  onSelect: (modelId: string) => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [maxInputPrice, setMaxInputPrice] = useState("");
  const [maxOutputPrice, setMaxOutputPrice] = useState("");
  const [sortKey, setSortKey] = useState<OpenRouterModelSortKey>("name");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeModel = useMemo(
    () => models.find((model) => model.id === selectedModel) ?? null,
    [models, selectedModel],
  );

  const filteredModels = useMemo(() => {
    const filtered = filterOpenRouterModels(models, {
      search,
      freeOnly,
      maxInputPricePerMillion: maxInputPrice ? Number(maxInputPrice) : null,
      maxOutputPricePerMillion: maxOutputPrice ? Number(maxOutputPrice) : null,
    });
    return sortOpenRouterModels(filtered, sortKey, sortKey === "name" ? "asc" : "desc");
  }, [freeOnly, maxInputPrice, maxOutputPrice, models, search, sortKey]);

  const loadedForOpenRef = useRef(false);
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    if (!open) {
      loadedForOpenRef.current = false;
      return;
    }
    if (loadedForOpenRef.current) return;
    loadedForOpenRef.current = true;
    onOpenRef.current();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-left text-[11px] text-gray-700 disabled:opacity-40"
      >
        <span className="min-w-0 truncate">
          {activeModel?.name ?? (selectedModel || "Vybrat OpenRouter model")}
        </span>
        {loading ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
        )}
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[24rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="space-y-2 border-b border-gray-100 p-2">
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Hledat model…"
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-gray-400"
              />
              <button
                type="button"
                onClick={() => onRefresh()}
                disabled={loading}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                aria-label="Obnovit modely"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <label className="flex items-center gap-1 text-gray-600">
                <input
                  type="checkbox"
                  checked={freeOnly}
                  onChange={(event) => setFreeOnly(event.target.checked)}
                />
                Jen free
              </label>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as OpenRouterModelSortKey)}
                className="rounded border border-gray-200 px-1 py-0.5"
              >
                <option value="name">Název</option>
                <option value="contextLength">Context</option>
                <option value="inputPrice">Input cena</option>
                <option value="outputPrice">Output cena</option>
              </select>
              <input
                value={maxInputPrice}
                onChange={(event) => setMaxInputPrice(event.target.value)}
                placeholder="Max input $/1M"
                className="rounded border border-gray-200 px-1 py-0.5"
              />
              <input
                value={maxOutputPrice}
                onChange={(event) => setMaxOutputPrice(event.target.value)}
                placeholder="Max output $/1M"
                className="rounded border border-gray-200 px-1 py-0.5"
              />
            </div>
            {stale ? (
              <div className="text-[10px] text-amber-600">
                Zobrazeny uložené modely{warning ? `: ${warning}` : "."}
              </div>
            ) : null}
            {error ? <div className="text-[10px] text-red-600">{error}</div> : null}
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filteredModels.length === 0 ? (
              <div className="px-3 py-4 text-xs text-gray-500">Žádné modely neodpovídají filtru.</div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelect(model.id);
                    setOpen(false);
                  }}
                  className={`w-full border-b border-gray-50 px-3 py-2 text-left hover:bg-gray-50 ${
                    model.id === selectedModel ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-gray-900">{model.name}</div>
                      <div className="truncate text-[10px] text-gray-500">{model.id}</div>
                    </div>
                    <div className="shrink-0 text-right text-[10px] text-gray-500">
                      <div>{formatContextLength(model.contextLength ?? model.providerContextLength)} ctx</div>
                      {model.maxCompletionTokens ? (
                        <div>{formatContextLength(model.maxCompletionTokens)} max out</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                    <span>in {formatUsdPerMillion(model.inputPricePerMillion)}</span>
                    <span>out {formatUsdPerMillion(model.outputPricePerMillion)}</span>
                  </div>
                  <ModelBadges model={model} />
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import {
  normalizeOpenRouterModels,
  sortOpenRouterModels,
  stripOpenRouterModelRaw,
} from "@/features/reader/domain/openRouterModelCatalog";
import { readOpenRouterApiKeyFromEnv } from "@/features/reader/infrastructure/agentLlm/agentLlmRouter";
import { fetchOpenRouterModelsRaw } from "@/features/reader/infrastructure/agentLlm/openRouterClient";
import {
  getCachedOpenRouterModels,
  setCachedOpenRouterModels,
} from "@/features/reader/infrastructure/agentLlm/openRouterModelsCache";

export async function GET(request: NextRequest) {
  const apiKey = readOpenRouterApiKeyFromEnv(process.env.OPENROUTER_API_KEY);
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY není nastavený na serveru." },
      { status: 500 },
    );
  }

  const forceRefresh = request.nextUrl.searchParams.get("forceRefresh") === "true";
  const cached = getCachedOpenRouterModels();

  const toClientModels = (models: ReturnType<typeof normalizeOpenRouterModels>) =>
    models.map(stripOpenRouterModelRaw);

  if (!forceRefresh && cached && !cached.stale) {
    return NextResponse.json({
      models: toClientModels(cached.models),
      stale: false,
    });
  }

  try {
    const rawModels = await fetchOpenRouterModelsRaw(apiKey);
    const models = sortOpenRouterModels(normalizeOpenRouterModels(rawModels), "name", "asc");
    setCachedOpenRouterModels(models);
    return NextResponse.json({ models: toClientModels(models), stale: false });
  } catch (err) {
    if (cached?.models.length) {
      return NextResponse.json({
        models: toClientModels(cached.models),
        stale: true,
        warning:
          err instanceof Error
            ? err.message
            : "Nepodařilo se obnovit seznam OpenRouter modelů.",
      });
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Nepodařilo se načíst OpenRouter modely.",
      },
      { status: 502 },
    );
  }
}

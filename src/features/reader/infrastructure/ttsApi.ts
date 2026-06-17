import type { Health, ProjectSnapshot, ProjectSummary, RenderStatus, TtsProviderId, Voice } from "../domain/types";
import {
  clearProjectBlockAudioCache,
  fetchProjectBlockAudioBlob,
  preloadProjectBlockAudio,
} from "./projectAudioCache";
import { getTtsApiBaseUrl, getTtsApiUrl, requestBlob, requestJson, requestVoid } from "./ttsHttpClient";

export async function fetchHealth() {
  return requestJson<Health>("/api/health", "Server unavailable", {
    signal: AbortSignal.timeout(3000),
  });
}

export async function fetchVoices(provider: TtsProviderId) {
  return requestJson<{ provider: TtsProviderId; default_voice: string; voices: Voice[] }>(`/api/voices?provider=${provider}`, "Unable to load voices", {
    cache: "no-store",
  });
}

export async function fetchProjects() {
  return requestJson<ProjectSummary[]>("/api/projects", "Unable to load projects", {
    cache: "no-store",
  });
}

export async function fetchProject(projectId: string) {
  return requestJson<ProjectSnapshot>(`/api/projects/${projectId}`, "Unable to load project.", {
    cache: "no-store",
  });
}

export async function createProject(input?: { title?: string; provider?: TtsProviderId; voice?: string }) {
  return requestJson<ProjectSnapshot>("/api/projects", "Unable to create project.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input?.title ?? null,
      provider: input?.provider ?? null,
      voice: input?.voice ?? null,
    }),
  });
}

export async function updateProject(
  projectId: string,
  input: { title?: string; pinned?: boolean },
) {
  return requestJson<ProjectSnapshot>(`/api/projects/${projectId}`, "Unable to update project.", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      pinned: input.pinned,
    }),
  });
}

export async function deleteProject(projectId: string) {
  clearProjectBlockAudioCache(projectId);
  await requestVoid(`/api/projects/${projectId}`, "Unable to delete project.", {
    method: "DELETE",
  });
}

export async function syncProject(input: {
  projectId?: string | null;
  provider: TtsProviderId;
  text: string;
  voice: string;
  blocks?: Array<{ text: string; voice: string }>;
  blockVoices?: string[];
  language?: string;
  speed?: number;
}) {
  return requestJson<ProjectSnapshot>("/api/projects/sync", "Project sync failed.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: input.projectId ?? null,
      provider: input.provider,
      text: input.text,
      voice: input.voice,
      blocks: input.blocks ?? [],
      block_voices: input.blockVoices ?? [],
      language: input.language ?? "cs",
      speed: input.speed ?? 1,
    }),
    errorDetail: true,
  });
}

export async function startProjectRender(projectId: string) {
  return requestJson<{
    status: "queued" | "ready";
    job_id: string | null;
    project: ProjectSnapshot;
  }>(`/api/projects/${projectId}/render`, "Project render failed.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    errorDetail: true,
  });
}

export async function importSupertonicVoiceStyle(file: File) {
  const form = new FormData();
  form.append("file", file);
  return requestJson<{ voice?: Voice }>("/api/providers/supertonic/styles", "Voice style import failed.", {
    method: "POST",
    body: form,
    errorDetail: true,
  });
}

export async function uploadVoice(file: File, provider: TtsProviderId) {
  if (provider === "supertonic") {
    return importSupertonicVoiceStyle(file);
  }
  const form = new FormData();
  form.append("file", file);
  return requestJson<{ voice?: Voice }>("/api/voices", "Voice upload failed.", {
    method: "POST",
    body: form,
    errorDetail: true,
  });
}

export async function startRender(input: {
  provider: TtsProviderId;
  text: string;
  voice: string;
  language?: string;
  speed?: number;
}) {
  return requestJson<{ id: string; status: string }>("/api/render", "Render failed.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: input.provider,
      text: input.text,
      voice: input.voice,
      language: input.language ?? "cs",
      speed: input.speed ?? 1,
    }),
    errorDetail: true,
  });
}

export async function fetchRenderStatus(jobId: string) {
  return requestJson<RenderStatus>(`/api/render/${jobId}`, "Unable to fetch render status.", {
    cache: "no-store",
  });
}

export async function fetchRenderBlockAudioBlob(jobId: string, blockIndex: number) {
  return requestBlob(`/api/render/${jobId}/blocks/${blockIndex}/audio`, "Unable to fetch block audio.", {
    cache: "no-store",
  });
}

export async function fetchRenderAudioBlob(jobId: string) {
  return requestBlob(`/api/render/${jobId}/audio`, "Unable to fetch final audio.");
}

export function getRenderDownloadUrl(jobId: string) {
  return getTtsApiUrl(`/api/render/${jobId}/download`);
}

export function getProjectDownloadUrl(projectId: string) {
  return getTtsApiUrl(`/api/projects/${projectId}/download`);
}

export { clearProjectBlockAudioCache, fetchProjectBlockAudioBlob, getTtsApiBaseUrl, preloadProjectBlockAudio };

import { useCallback, useRef } from "react";
import type { ProjectSnapshot } from "../domain/types";
import { debugSessionLog } from "./debugSessionLog";
import { fetchProject, startProjectRender } from "../infrastructure/ttsApi";

const POLL_INTERVAL_MS = 600;

type PollingFailureContext = {
  projectId: string;
  token: number;
  source: string;
};

type ProjectPollingArgs = {
  applyProject: (project: ProjectSnapshot) => void;
  tryStartPlayback: () => Promise<boolean>;
  shouldKeepPolling: () => boolean;
  onFailure: (message: string) => void;
  onPollingError?: (message: string, context: PollingFailureContext) => void;
  onProjectPolled?: (project: ProjectSnapshot, context: { projectId: string; token: number }) => void;
  onRenderRestart?: (project: ProjectSnapshot, context: { projectId: string; reason: string }) => void;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getProjectError(project: ProjectSnapshot) {
  return project.blocks.find((block) => block.error)?.error ?? "Generování projektu selhalo.";
}

export function getProjectPollSignature(project: ProjectSnapshot) {
  return [
    project.status,
    project.progress.done,
    project.progress.total,
    ...project.blocks.map(
      (block) => `${block.index}:${block.status}:${block.audio_ready ? 1 : 0}:${block.cache_key}`,
    ),
  ].join("|");
}

export function useProjectPolling({
  applyProject,
  tryStartPlayback,
  shouldKeepPolling,
  onFailure,
  onPollingError,
  onProjectPolled,
  onRenderRestart,
}: ProjectPollingArgs) {
  const pollTokenRef = useRef(0);
  const lastHandledPollingErrorRef = useRef<string | null>(null);
  const lastPollSignatureRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    pollTokenRef.current += 1;
  }, []);

  const resetPollingError = useCallback(() => {
    lastHandledPollingErrorRef.current = null;
  }, []);

  const pollProjectUntilReady = useCallback(
    async (projectId: string, token: number) => {
      while (token === pollTokenRef.current) {
        const project = await fetchProject(projectId);
        const signature = getProjectPollSignature(project);
        const projectChanged = signature !== lastPollSignatureRef.current;
        lastPollSignatureRef.current = signature;

        if (projectChanged) {
          debugSessionLog({
            location: "useProjectPolling.ts:poll",
            message: "project poll state changed",
            data: {
              projectId,
              status: project.status,
              done: project.progress.done,
              total: project.progress.total,
              blockStatuses: project.blocks.map((block) => ({
                index: block.index,
                status: block.status,
                voice: block.voice,
                audioReady: block.audio_ready,
              })),
            },
            hypothesisId: "FACT-P1",
          });
          applyProject(project);
          onProjectPolled?.(project, { token, projectId });
        }

        if (project.status === "error") {
          throw new Error(getProjectError(project));
        }

        if (
          project.status === "ready" &&
          project.progress.total > 0 &&
          project.progress.done < project.progress.total
        ) {
          const reason = "project-ready-but-progress-incomplete";
          onRenderRestart?.(project, { projectId, reason });
          const restarted = await startProjectRender(projectId);
          applyProject(restarted.project);
        }

        if (!projectChanged) {
          await delay(POLL_INTERVAL_MS);
          continue;
        }

        const started = await tryStartPlayback();
        if (started) return;
        if (!shouldKeepPolling()) return;

        await delay(POLL_INTERVAL_MS);
      }
    },
    [applyProject, onProjectPolled, onRenderRestart, shouldKeepPolling, tryStartPlayback],
  );

  const handlePollingFailure = useCallback(
    (error: unknown, context: PollingFailureContext) => {
      const message = error instanceof Error ? error.message : "Generování projektu selhalo.";
      onPollingError?.(message, context);

      if (context.token !== pollTokenRef.current) return;
      if (lastHandledPollingErrorRef.current === message) return;

      lastHandledPollingErrorRef.current = message;
      stopPolling();
      onFailure(message);
    },
    [onFailure, onPollingError, stopPolling],
  );

  const startPolling = useCallback(
    (projectId: string, source: string) => {
      pollTokenRef.current += 1;
      const token = pollTokenRef.current;
      lastPollSignatureRef.current = null;
      void pollProjectUntilReady(projectId, token).catch((error) => {
        handlePollingFailure(error, { projectId, token, source });
      });
    },
    [handlePollingFailure, pollProjectUntilReady],
  );

  return {
    resetPollingError,
    startPolling,
    stopPolling,
  };
}

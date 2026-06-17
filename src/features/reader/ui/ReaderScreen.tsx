"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { debugSessionLog } from "../application/debugSessionLog";
import { Copy, ScissorsLineDashed, Sparkles, Trash2 } from "lucide-react";
import { canStartPlayback } from "../domain/workflow";
import { useReaderController } from "../application/useReaderController";
import { AgentChatPanelContainer } from "./AgentChatPanelContainer";
import { ErrorBanner } from "./ErrorBanner";
import { PlaybackControls } from "./PlaybackControls";
import { PlaybackView } from "./PlaybackView";
import { ProjectSelector } from "./ProjectSelector";
import { TextEditor } from "./TextEditor";
import { VoiceSelector } from "./VoiceSelector";

export function ReaderScreen() {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const controller = useReaderController();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingVoiceTarget, setUploadingVoiceTarget] = useState<"global" | number | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const renderCountRef = useRef(0);
  const lastWorkflowStageRef = useRef(controller.state.workflowStage);

  useEffect(() => {
    renderCountRef.current += 1;
  });

  useEffect(() => {
    const stage = controller.state.workflowStage;
    if (lastWorkflowStageRef.current === stage) return;
    debugSessionLog({
      location: "ReaderScreen.tsx:workflowStage",
      message: "workflow stage changed",
      data: {
        from: lastWorkflowStageRef.current,
        to: stage,
        agentOpen,
        renderCount: renderCountRef.current,
        projectId: controller.state.currentProjectId,
        playbackState: controller.state.playbackState,
      },
      hypothesisId: "FACT-R1",
    });
    lastWorkflowStageRef.current = stage;
  }, [
    agentOpen,
    controller.state.currentProjectId,
    controller.state.playbackState,
    controller.state.workflowStage,
  ]);

  useEffect(() => {
    if (controller.state.workflowStage !== "playing") return;
    const interval = window.setInterval(() => {
      debugSessionLog({
        location: "ReaderScreen.tsx:playingTick",
        message: "reader screen render count during playback",
        data: {
          renderCount: renderCountRef.current,
          agentOpen,
          agentMounted: agentOpen,
          playbackState: controller.state.playbackState,
          projectDone: controller.state.progress?.done ?? null,
          projectTotal: controller.state.progress?.total ?? null,
        },
        hypothesisId: "FACT-R2",
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [
    agentOpen,
    controller.state.playbackState,
    controller.state.progress?.done,
    controller.state.progress?.total,
    controller.state.workflowStage,
  ]);

  const isPlaybackVisible = controller.state.workflowStage !== "editing";
  const canPlay = canStartPlayback(controller.state.workflowStage, controller.chunks.length);
  const isWorkflowLocked = controller.state.workflowStage === "playing";
  const providers = controller.state.health?.providers ?? [];
  const activeProvider = providers.find((provider) => provider.id === controller.state.selectedProvider);
  const offlineProvider = providers.find((provider) => !provider.online);
  const uploadLabel = controller.state.selectedProvider === "supertonic" ? "Importovat JSON hlas" : "Přidat WAV hlas";

  if (!mounted) {
    return <div className="min-h-screen w-full bg-white" />;
  }

  return (
    <div className="min-h-screen w-full bg-white font-sans">
      <ProjectSelector
        currentProjectId={controller.state.currentProjectId}
        projects={controller.state.projects}
        onProjectOpen={(projectId) => void controller.onProjectOpen(projectId)}
        onProjectCreate={() => void controller.onProjectCreate()}
        onProjectRename={(projectId, title) => void controller.onProjectRename(projectId, title)}
        onProjectPin={(projectId, pinned) => void controller.onProjectPin(projectId, pinned)}
        onProjectDelete={(projectId) => void controller.onProjectDelete(projectId)}
      />
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col p-6 md:p-12 lg:p-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={controller.onCleanText}
              disabled={isWorkflowLocked}
              className="flex items-center gap-1 text-inherit transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-3 w-3" />
              Vyčistit text
            </button>
            <button
              onClick={() => void controller.onSplitBlocks()}
              disabled={!controller.state.text.trim() || isWorkflowLocked}
              className="flex items-center gap-1 text-inherit transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ScissorsLineDashed className="h-3 w-3" />
              Rozdělit do bloků
            </button>
            <button
              onClick={() => void controller.onCopy()}
              className="flex items-center gap-1 text-inherit transition-colors hover:text-black"
            >
              <Copy className="h-3 w-3" />
              Kopírovat
            </button>
            <button
              onClick={controller.onClear}
              disabled={isWorkflowLocked}
              className="flex items-center gap-1 text-inherit transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              Smazat vše
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 rounded-full border border-black/10 p-1 text-[10px] font-medium uppercase tracking-[0.16em]">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    title={provider.online ? undefined : provider.error ?? "Engine není dostupný"}
                    onClick={() => void controller.onProviderChange(provider.id)}
                    disabled={isWorkflowLocked || !provider.online}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      controller.state.selectedProvider === provider.id
                        ? "bg-black text-white"
                        : "text-gray-500 hover:text-black"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
              {offlineProvider ? (
                <p className="max-w-xs text-right text-[10px] normal-case tracking-normal text-amber-700">
                  {offlineProvider.label} není dostupný: {offlineProvider.error ?? "zkontrolujte backend a restartujte aplikaci"}
                </p>
              ) : null}
            </div>

            <VoiceSelector
              selectedVoice={controller.state.selectedVoice}
              voices={controller.state.voices}
              disabled={isWorkflowLocked || !activeProvider?.online}
              uploading={controller.state.uploading && uploadingVoiceTarget === "global"}
              uploadLabel={uploadLabel}
              onVoiceChange={controller.onVoiceChange}
              onUploadClick={() => {
                setUploadingVoiceTarget("global");
                fileRef.current?.click();
              }}
            />
          </div>
        </div>

        <ErrorBanner error={controller.state.error} onDismiss={controller.onDismissError} />

        <div className="relative flex-grow">
          {isPlaybackVisible ? (
            <PlaybackView
              chunks={controller.chunks}
              currentChunkIndex={controller.currentChunkIndex}
              textScale={controller.state.textScale}
              voices={controller.state.voices}
              blockVoices={controller.state.blockVoices}
              uploading={controller.state.uploading}
              uploadLabel={uploadLabel}
              canAssignVoice={controller.state.workflowStage === "assigning"}
              onChunkClick={controller.onChunkClick}
              onBlockVoiceChange={controller.onBlockVoiceChange}
              onBlockVoiceUpload={(index) => {
                setUploadingVoiceTarget(index);
                fileRef.current?.click();
              }}
            />
          ) : (
            <TextEditor
              refObject={controller.textareaRef}
              text={controller.state.text}
              textScale={controller.state.textScale}
              disabled={controller.state.playbackState === "loading"}
              onChange={controller.onTextChange}
              onDoubleClick={controller.onEditorDoubleClick}
            />
          )}
        </div>

        <PlaybackControls
          playbackState={controller.state.playbackState}
          workflowStage={controller.state.workflowStage}
          statusLabel={controller.playbackStatus?.label ?? null}
          downloadUrl={controller.downloadUrl}
          canPlay={canPlay}
          onPlay={() => void controller.onPlay()}
          onPause={controller.onPause}
          onResume={() => void controller.onResume()}
          onStop={controller.onStop}
        />

        {agentOpen ? (
          <AgentChatPanelContainer
            onClose={() => setAgentOpen(false)}
            onAgentSend={controller.onAgentSend}
            onAgentApplyScript={controller.onAgentApplyScript}
          />
        ) : null}

        <button
          type="button"
          onClick={() => setAgentOpen(true)}
          disabled={!controller.state.voices.length || agentOpen}
          aria-label="Otevřít agenta"
          title="Agent"
          className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:text-black hover:shadow-md disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Sparkles className="h-4 w-4" />
        </button>

        <input
          ref={fileRef}
          type="file"
          accept={controller.state.selectedProvider === "supertonic" ? ".json,application/json" : ".wav,audio/wav"}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && uploadingVoiceTarget !== null) {
              void controller.onSelectedVoiceUploadTarget(uploadingVoiceTarget, file);
            }
            setUploadingVoiceTarget(null);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

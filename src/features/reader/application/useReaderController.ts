import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { splitTextIntoParagraphChunks } from "../domain/chunking";
import type { ProjectSnapshot } from "../domain/types";
import { fetchProject, fetchProjects, createProject, updateProject } from "../infrastructure/ttsApi";
import { useReaderControllerHandlers } from "./readerControllerHandlers";
import { applySplitBlocksState, buildResolvedBlockVoices, clearReaderProjectState, prepareReaderProject, switchReaderProvider } from "./readerProjectCommands";
import { initialReaderState, readerReducer } from "./readerReducer";
import { readerActions } from "./readerActions";
import { useReaderSettings } from "./useReaderSettings";
import { useReaderHealthAndVoices } from "./useReaderHealthAndVoices";
import { useLongFormPlaybackSession } from "./useLongFormPlaybackSession";
import { applyOpenedProjectState, resetReaderEditingState } from "./useProjectPreparation";
import { applyAgentScript, sendAgentChatMessage } from "./agentChatCommand";
import type { AgentChatMessage, AgentScriptBlock, SendAgentChatOptions } from "./agentChatCommand";

export function useReaderController() {
  const [state, dispatch] = useReducer(readerReducer, initialReaderState);
  const paragraphChunks = useMemo(() => splitTextIntoParagraphChunks(state.text), [state.text]);
  const hydratedProjectIdRef = useRef<string | null>(null);
  const initialRestoreDoneRef = useRef(false);

  useReaderSettings(state, dispatch);
  const refreshProjects = useCallback(async () => {
    try { dispatch(readerActions.setProjects(await fetchProjects())); }
    catch { dispatch(readerActions.setProjects([])); }
  }, []);
  const { refreshVoices, refreshVoicesForProvider } = useReaderHealthAndVoices(state.selectedProvider, state.selectedVoice, dispatch);
  const playbackSession = useLongFormPlaybackSession({
    state,
    dispatch,
    chunks: paragraphChunks,
    refreshVoices,
    refreshProjects,
  });
  const openPlaybackProject = playbackSession.onProjectOpen;
  const chunks = state.workflowStage !== "editing" ? playbackSession.playbackChunks ?? paragraphChunks : [];

  const openProjectIntoReader = useCallback(async (project: ProjectSnapshot) => {
    hydratedProjectIdRef.current = project.id;
    await openPlaybackProject(project);
    applyOpenedProjectState(project, dispatch);
  }, [openPlaybackProject]);

  const clearActiveProjectState = useCallback((options?: { stopPlayback?: boolean }) => {
    hydratedProjectIdRef.current = null;
    if (options?.stopPlayback) playbackSession.onStop();
    clearReaderProjectState(dispatch);
  }, [dispatch, playbackSession]);
  const setHydratedProjectId = useCallback((projectId: string | null) => { hydratedProjectIdRef.current = projectId; }, []);
  const markInitialRestoreDone = useCallback(() => { initialRestoreDoneRef.current = true; }, []);

  useEffect(() => {
    if (!chunks.length && state.selectedChunk !== 0) {
      dispatch(readerActions.selectChunk(0));
      return;
    }
    if (chunks.length && state.selectedChunk > chunks.length - 1) {
      dispatch(readerActions.selectChunk(chunks.length - 1));
    }
  }, [chunks, state.selectedChunk]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const projects = await fetchProjects();
        if (!cancelled) dispatch(readerActions.setProjects(projects));
      } catch {
        if (!cancelled) dispatch(readerActions.setProjects([]));
      }
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

  useEffect(() => {
    if (initialRestoreDoneRef.current) return;
    if (!state.currentProjectId) return;

    let cancelled = false;
    initialRestoreDoneRef.current = true;

    void (async () => {
      try {
        const project = await fetchProject(state.currentProjectId!);
        if (cancelled) return;
        await openProjectIntoReader(project);
      } catch {
        if (cancelled) return;
        clearActiveProjectState();
      }
    })();

    return () => { cancelled = true; };
  }, [clearActiveProjectState, openProjectIntoReader, state.currentProjectId]);

  const handlers = useReaderControllerHandlers({
    state,
    dispatch,
    paragraphChunks,
    playbackSession,
    refreshProjects,
    clearActiveProjectState,
  });

  const onSplitBlocks = useCallback(async () => {
    if (!paragraphChunks.length) return;
    try {
      markInitialRestoreDone();
      const nextBlockVoices = buildResolvedBlockVoices(paragraphChunks, state.blockVoices, state.selectedVoice);
      applySplitBlocksState(dispatch, paragraphChunks.length, nextBlockVoices);
      const project = await prepareReaderProject({
        prepareProject: playbackSession.prepareProject,
        projectId: state.currentProjectId,
        provider: state.selectedProvider,
        text: state.text,
        voice: state.selectedVoice,
        speed: state.speed,
        blocks: paragraphChunks,
        blockVoices: nextBlockVoices,
      });
      if (project) {
        setHydratedProjectId(project.id);
      }
    } catch (error) {
      dispatch(readerActions.setError(error instanceof Error ? error.message : "Bloky se nepodařilo připravit."));
    }
  }, [dispatch, markInitialRestoreDone, paragraphChunks, playbackSession.prepareProject, setHydratedProjectId, state.blockVoices, state.currentProjectId, state.selectedProvider, state.selectedVoice, state.speed, state.text]);

  const onProviderChange = useCallback(async (provider: "omnivoice" | "supertonic") => {
    try {
      const project = await switchReaderProvider({
        provider,
        selectedVoice: state.selectedVoice,
        currentProjectId: state.currentProjectId,
        isBlockMode: state.isBlockMode,
        text: state.text,
        speed: state.speed,
        blocks: paragraphChunks,
        dispatch,
        refreshVoicesForProvider,
        prepareProject: playbackSession.prepareProject,
      });
      if (project) setHydratedProjectId(project.id);
    } catch (error) {
      dispatch(readerActions.setError(error instanceof Error ? error.message : "Provider se nepodařilo přepnout."));
    }
  }, [dispatch, paragraphChunks, playbackSession.prepareProject, refreshVoicesForProvider, setHydratedProjectId, state.currentProjectId, state.isBlockMode, state.selectedVoice, state.speed, state.text]);

  const onProjectOpen = useCallback(async (projectOrId: ProjectSnapshot | string) => {
    try {
      markInitialRestoreDone();
      const project = typeof projectOrId === "string" ? await fetchProject(projectOrId) : projectOrId;
      await openProjectIntoReader(project);
      await refreshProjects();
    } catch (error) {
      dispatch(readerActions.setError(error instanceof Error ? error.message : "Projekt se nepodařilo otevřít."));
    }
  }, [dispatch, markInitialRestoreDone, openProjectIntoReader, refreshProjects]);

  const onAgentSend = useCallback(
    (messages: AgentChatMessage[], options: SendAgentChatOptions) =>
      sendAgentChatMessage(messages, state.voices, state.selectedVoice, options),
    [state.selectedVoice, state.voices],
  );
  const onAgentApplyScript = useCallback(async (blocks: AgentScriptBlock[]) => {
    try {
      markInitialRestoreDone();
      const project = await applyAgentScript({
        blocks,
        provider: state.selectedProvider,
        defaultVoice: state.selectedVoice,
        speed: state.speed,
        dispatch,
        prepareProject: playbackSession.prepareProject,
      });
      if (project) { setHydratedProjectId(project.id); await refreshProjects(); }
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aplikace scénáře selhala.";
      dispatch(readerActions.setError(message));
      return { ok: false as const, error: message };
    }
  }, [dispatch, markInitialRestoreDone, playbackSession.prepareProject, refreshProjects, setHydratedProjectId, state.selectedProvider, state.selectedVoice, state.speed]);

  const onProjectCreate = useCallback(async () => {
    try {
      markInitialRestoreDone();
      dispatch(readerActions.setError(null));
      const project = await createProject({ provider: state.selectedProvider, voice: state.selectedVoice });
      await openProjectIntoReader(project);
      await refreshProjects();
    } catch (error) {
      dispatch(readerActions.setError(error instanceof Error ? error.message : "Projekt se nepodařilo vytvořit."));
    }
  }, [dispatch, markInitialRestoreDone, openProjectIntoReader, refreshProjects, state.selectedProvider, state.selectedVoice]);

  const onProjectRename = useCallback(async (projectId: string, title: string) => {
    try {
      markInitialRestoreDone();
      dispatch(readerActions.setError(null));
      await updateProject(projectId, { title });
      await refreshProjects();
      if (state.currentProjectId === projectId) {
        const project = await fetchProject(projectId);
        await openProjectIntoReader(project);
      }
    } catch (error) {
      dispatch(readerActions.setError(error instanceof Error ? error.message : "Projekt se nepodařilo přejmenovat."));
    }
  }, [dispatch, markInitialRestoreDone, openProjectIntoReader, refreshProjects, state.currentProjectId]);

  return {
    state,
    chunks,
    currentChunkIndex: playbackSession.currentChunkIndex,
    downloadUrl: playbackSession.downloadUrl,
    playbackStatus: playbackSession.playbackStatus,
    textareaRef: playbackSession.textareaRef,
    ...handlers,
    onProviderChange,
    onSplitBlocks,
    onProjectOpen,
    onProjectCreate,
    onProjectRename,
    onAgentSend,
    onAgentApplyScript,
  };
}

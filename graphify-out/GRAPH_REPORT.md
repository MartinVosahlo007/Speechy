# Graph Report - speechy  (2026-06-08)

## Corpus Check
- 138 files · ~49,619 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 636 nodes · 822 edges · 23 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 155 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 34|Community 34]]

## God Nodes (most connected - your core abstractions)
1. `JobService` - 46 edges
2. `HttpAppTests` - 27 edges
3. `ProjectStore` - 24 edges
4. `OmniVoiceRuntime` - 21 edges
5. `JobServiceTests` - 21 edges
6. `LegacyRenderService` - 19 edges
7. `SupertonicRuntime` - 17 edges
8. `requestJson()` - 16 edges
9. `FakeJobs` - 16 edges
10. `TaskRegistry` - 15 edges

## Surprising Connections (you probably didn't know these)
- `useLongFormPlaybackSession()` --calls--> `useProjectPreparation()`  [INFERRED]
  src\features\reader\application\useLongFormPlaybackSession.ts → src\features\reader\application\useProjectPreparation.ts
- `JobService` --calls--> `create_jobs()`  [INFERRED]
  tts-server\application\job_service.py → tts-server\presentation\dependencies.py
- `InferenceOptions` --calls--> `parse_inference_options()`  [INFERRED]
  tts-server\domain\provider_types.py → tts-server\presentation\dependencies.py
- `POST()` --calls--> `resolveRequestedProvider()`  [INFERRED]
  src\app\api\agent\chat\route.ts → src\features\reader\infrastructure\agentLlm\agentLlmEnv.ts
- `POST()` --calls--> `readDefaultOpenRouterModel()`  [INFERRED]
  src\app\api\agent\chat\route.ts → src\features\reader\infrastructure\agentLlm\agentLlmEnv.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (6): create_app(), FakeJobs, FakeRuntime, FakeVoicePath, FakeVoiceStore, HttpAppTests

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (3): ProjectAudioAssembler, JobService, TaskRegistry

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (10): prepare_runtime_voice(), _render_parameter_names(), render_runtime_block(), _supports_parameter(), FakeRuntime, JobServiceTests, LegacyVoiceCloneRuntime, PreparedVoiceRuntime (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (30): applyAgentScript(), sendAgentChatMessage(), applyPlaybackIdleState(), applyPlaybackLoadingState(), applySplitBlocksState(), buildResolvedBlockVoices(), buildUpdatedBlockVoices(), clearReaderProjectState() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (10): build_project_block_filename(), build_project_cache_key(), build_synced_project_blocks(), derive_project_title(), normalize_project_text(), slugify_project_value(), hydrate_loaded_project(), recompute_project_timeline() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (28): clearProjectBlockAudioCache(), ensureActiveProjectAudioCache(), fetchProjectBlockAudioBlob(), preloadProjectBlockAudio(), createProject(), deleteProject(), fetchHealth(), fetchProject() (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (22): readAgentLlmProviderStatus(), readDefaultOpenRouterModel(), readMinimaxModelFromEnv(), resolveRequestedProvider(), completeWithProvider(), readOpenRouterApiKeyFromEnv(), resolveDefaultAgentLlmProvider(), completeMinimaxChat() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (4): ensure_gpu_ready(), VoiceStore, OmniVoiceRuntime, sample_rate()

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (16): attemptDesiredPlaybackOrStartPolling(), shouldStartProjectRender(), applyOpenedProjectPlaybackState(), resolvePreparedProjectDownloadUrl(), startPlaybackForPreparedProject(), buildPlaybackChunksFromProject(), getProjectPlaybackError(), resolveProjectDownloadUrl() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (11): LegacyRenderService, BaseModel, InferenceOptions, Job, RenderBlock, TimelineBlock, ProjectCreateRequest, ProjectSyncRequest (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (10): getCachedOpenRouterModels(), setCachedOpenRouterModels(), hasSupportedParameter(), normalizeOpenRouterModel(), normalizeOpenRouterModels(), parsePositiveInt(), parsePrice(), sortOpenRouterModels() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (5): ProviderRegistry, create_jobs(), create_runtime_registry(), parse_inference_options(), ensure_runtime_registry()

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (2): _agent_log(), SupertonicRuntime

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (7): createPlaybackSession(), useTestHandlers(), useReaderControllerHandlers(), createInitialReaderState(), useReaderController(), useReaderHealthAndVoices(), useReaderSettings()

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (2): TtsProviderRuntime, Protocol

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (4): buildAgentUserContent(), useAgentChatPanelSession(), useAgentLlmSettings(), AgentChatPanelContainer()

### Community 16 - "Community 16"
Cohesion: 0.26
Nodes (5): _normalize_text(), Helpers for splitting long Czech text into stable render blocks., _split_oversized_sentence(), split_text_into_chunks(), SplitTextIntoChunksTests

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (1): FakeAudio

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): canBindPortOnHost(), checkPortAvailable(), findFreePort(), hasLocalListener(), pipeOutput(), startProcess()

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (2): _agent_log(), ProjectRenderService

### Community 22 - "Community 22"
Cohesion: 0.7
Nodes (4): buildPlaybackTracePayload(), emitPlaybackTrace(), getDesiredBlock(), tracePlaybackEvent()

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (2): deriveAppliedProjectRuntime(), getProjectAudioCacheSignature()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (1): GovernanceGuardTests

## Knowledge Gaps
- **1 isolated node(s):** `Helpers for splitting long Czech text into stable render blocks.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (17 nodes): `_agent_log()`, `SupertonicRuntime`, `.concatenate_rendered_blocks()`, `.default_voice_name()`, `._ensure_sdk()`, `._ensure_tts()`, `.import_voice_asset()`, `.__init__()`, `.list_voices()`, `.prepare_voice()`, `.read_final_wav()`, `.read_wav()`, `.render_single_block()`, `.supports_style_import()`, `.supports_voice_upload()`, `.write_final_wav()`, `supertonic_runtime.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (14 nodes): `TtsProviderRuntime`, `.concatenate_rendered_blocks()`, `.default_voice_name()`, `.import_voice_asset()`, `.list_voices()`, `.prepare_voice()`, `.read_final_wav()`, `.read_wav()`, `.render_single_block()`, `.supports_style_import()`, `.supports_voice_upload()`, `.write_final_wav()`, `Protocol`, `contracts.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (10 nodes): `FakeAudio`, `.addEventListener()`, `.constructor()`, `.emitEnded()`, `.load()`, `.pause()`, `.play()`, `.removeAttribute()`, `.removeEventListener()`, `audioPlayer.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (9 nodes): `_agent_log()`, `ProjectRenderService`, `._build_inference_options()`, `.__init__()`, `._log_project_render_error()`, `.render_project()`, `._run_project()`, `.wait_for_project()`, `project_render_service.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (3 nodes): `deriveAppliedProjectRuntime()`, `getProjectAudioCacheSignature()`, `projectPlaybackState.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `GovernanceGuardTests`, `.test_checker_fails_closed_when_git_diff_is_unavailable()`, `test_governance_guard.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JobService` connect `Community 1` to `Community 2`, `Community 4`, `Community 9`, `Community 11`, `Community 16`, `Community 19`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `ProviderRegistry` connect `Community 11` to `Community 1`, `Community 9`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `ProjectStore` connect `Community 4` to `Community 1`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `JobService` (e.g. with `LegacyRenderService` and `ProjectAudioAssembler`) actually correct?**
  _`JobService` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `ProjectStore` (e.g. with `JobService` and `.__init__()`) actually correct?**
  _`ProjectStore` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `OmniVoiceRuntime` (e.g. with `InferenceOptions` and `VoiceStore`) actually correct?**
  _`OmniVoiceRuntime` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Helpers for splitting long Czech text into stable render blocks.` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
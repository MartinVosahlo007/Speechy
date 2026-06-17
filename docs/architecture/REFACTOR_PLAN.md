# Refactor Playbook: Speechy Architecture Recovery

This is an execution playbook for future refactor work. It is intentionally concrete: use it before editing so the refactor lowers risk instead of only moving code around.

## North Star

Speechy should have this dependency shape:

```text
Frontend:
ui -> application -> domain
                 -> infrastructure -> domain

Backend:
presentation -> application -> domain
                         -> infrastructure -> domain
```

Meaning:

- UI renders data and delegates events. It owns only local visual state: hover, open menus, focus, selected tab, transient draft input.
- Application owns workflows and state transitions. It may call domain and infrastructure, but each hook/service should coordinate one cohesive use case.
- Domain owns pure decisions: chunk selection, workflow stage transitions, timeline calculations, cache-key inputs, block readiness policy.
- Infrastructure owns effects only: API, audio element, object URLs, localStorage, clipboard, filesystem, model runtime, GPU checks.

If code does not clearly fit one of those bullets, stop and name the responsibility before adding it.

## Progress Snapshot (2026-06-08)

Partial refactors already landed. **Before editing, run `npm run check:architecture`** — hotspot limits are defined in `scripts/check-architecture.mjs`, not in this doc.

| Phase | Status | Evidence in repo |
|---|---|---|
| 1 — project preparation | **Done** | `useProjectPreparation.ts`; imported by `useLongFormPlaybackSession` |
| 2 — project polling | **Done** | `useProjectPolling.ts`; imported by `useLongFormPlaybackSession` |
| 3 — audio session | **Done** | `useAudioPlaybackSession.ts`; imported by `useLongFormPlaybackSession` |
| 5 — task registry | **Done** | `task_registry.py`; used by `JobService` |
| 6 — backend render split | **Partial** | `legacy_render_service.py`, `project_render_service.py`, `audio_assembly.py` exist; `job_service.py` is still a wide facade |
| 8 — slim HTTP | **Partial** | `serializers.py`, `http_models.py`, `dependencies.py`, `provider_helpers.py` extracted; `http.py` still composes routes |
| 4, 7, 9 | **Open** | Reader hydration dedup; project policy out of `ProjectStore`; enforcement ratchet |

Completed phases are summarized below. Open phases keep the original targets.

## Evidence Behind This Plan

Verified repo facts (re-check with source + `npm run check:architecture` before acting):

| Area | Evidence | Why it matters |
|---|---|---|
| `JobService` | Facade delegating to `LegacyRenderService` + `ProjectRenderService`; Graphify degree 41 | Legacy and project render paths still meet here. |
| `ProjectStore` | Hotspot limit 250 in `check-architecture.mjs`; Graphify degree 27 | Persistence coupled to project policy. |
| `useLongFormPlaybackSession` | Hotspot limit 420; composes preparation/polling/audio hooks | Playback transition wiring still lives here. |
| Playback mutable state | refs at lines 56-69 plus `tryPlayDesiredChunkRef` around 161 | Correctness depends on update order across refs. |
| `useReaderController` | Hotspot limit 230 | Central reader wiring; hydration dedup still open (phase 4). |
| `ProjectStore.get_project()` | loads, recomputes timeline, saves, then returns | A read operation mutates storage. |
| `http.py` | Hotspot limit 280; uses extracted serializers/models | Presentation composition still dense. |

Graphify is a lead generator, not proof by itself. Confirm every row in source before refactoring.

## Non-Negotiable Invariants

Do not break these while refactoring:

1. Existing public API routes and response shapes stay stable unless a separate API migration is explicitly planned.
2. Existing reader flows stay stable:
   - paste/edit text
   - split into blocks
   - choose global voice
   - choose per-block voice
   - create/open/rename/pin/delete project
   - play, pause, resume, stop
   - click a block during playback/rendering
   - download final project audio
3. Render cache behavior stays stable:
   - unchanged blocks reuse existing audio
   - changed text or voice regenerates only affected blocks
   - final audio is invalidated when block keys change
4. Error states remain observable:
   - prompt creation failure marks the job/project as error
   - block render failure marks only the failing path as error
   - frontend polling failures stop playback and surface the message once
5. Cleanup remains intact:
   - object URLs are revoked
   - audio stops when project/playback changes
   - cancelled backend tasks do not keep stale active jobs
   - deleted projects remove their project directory and block WAVs

If a proposed extraction makes any invariant harder to test or reason about, the extraction is too large.

## Refactor Rules During Execution

Use these rules every time:

1. Characterize behavior first when behavior is subtle. Prefer tests around pure decisions and adapter boundaries.
2. Extract without changing behavior first. Rename and improve only after tests pass.
3. Keep compatibility facades temporarily. Do not force every caller to change in the same patch.
4. One patch should have one reason to change. Do not mix frontend split, backend split, and governance tightening.
5. Do not move code into `domain` if it touches React, browser APIs, filesystem, FastAPI, torch, model runtime, timers, or network.
6. Do not move code into `infrastructure` if it decides workflow policy.
7. Do not add stricter architecture guards until the current code can pass them. Ratchet after cleanup, not before.

## Phase 0: Baseline Map And Tests

Purpose: make the next extraction safe.

Actions:

- Record current hotspots with:
  - `npm run graphify:explain -- "useLongFormPlaybackSession()"`
  - `npm run graphify:explain -- "JobService"`
  - targeted `rg` reads for imports, refs, and method lists
- Run the baseline checks before touching runtime code:
  - `npm run test:frontend`
  - `npm run test:backend`
  - `npm run check:architecture`

Add characterization tests only where behavior is not already covered:

- Frontend pure tests for:
  - next playable block selection
  - workflow stage after stop
  - project/playback status mapping
  - polling failure deduplication if extracted into a pure helper
- Backend tests for:
  - partial project edit regenerates only changed blocks
  - per-block voice change regenerates only that block
  - project render writes block WAVs into project directories
  - delete project removes project directory and block WAVs

Exit criteria:

- Current checks pass or known failures are written down before edits.
- The first extraction target has a test that can fail if behavior changes.

## Phase 1: Extract Frontend Project Preparation — DONE

**Landed:** `src/features/reader/application/useProjectPreparation.ts` — project sync/open preparation extracted from the long-form playback hook.

**Remaining (optional):** further shrink `useLongFormPlaybackSession` now that preparation is isolated; add tests if payload edge cases are still uncovered.

<details>
<summary>Original playbook (historical)</summary>

Problem: preparation was inseparable from audio.

Target was: dedicated hook for `syncProject`, block voices, progress application, project list refresh — without audio or polling.

Exit criteria met: preparation mockable without `createAudioPlayer`; `npm run test:frontend` passes.

</details>

## Phase 2: Extract Frontend Polling — DONE

**Landed:** `src/features/reader/application/useProjectPolling.ts` — polling token lifecycle, render restart, failure handling.

**Remaining (optional):** pure helper tests for polling failure deduplication if not already covered.

<details>
<summary>Original playbook (historical)</summary>

Target was: extract `pollProjectUntilReady`, failure normalization, and restart logic out of the long-form hook.

Exit criteria met: polling reasoned about separately from audio code.

</details>

## Phase 3: Extract Frontend Audio Session — DONE

**Landed:** `src/features/reader/application/useAudioPlaybackSession.ts` — audio player lifecycle, object URLs, pause/resume/stop.

**Remaining:** keep playback *transition* policy in `useLongFormPlaybackSession` shrinking over time; do not move project sync back into the audio hook.

<details>
<summary>Original playbook (historical)</summary>

Target was: sole owner of `createAudioPlayer`, object URL revoke, element error mapping.

Exit criteria met: long-form hook composes preparation + polling + audio.

</details>

## Phase 4: Deduplicate Reader Controller Hydration

Problem being solved:

`useReaderController` repeats the sequence "open project -> set text -> set block mode -> set workflow stage -> set block voices" across restore/open/rename/create paths.

Target:

- Add a focused application helper such as `applyProjectToReaderState(project, dispatch, options)`.
- Or add a hook-level command object inside `useReaderController` if it needs refs.
- Keep the canonical sequence in one place.

Exit criteria:

- Restore, open, rename-refresh, and create project paths call the same setup path.
- `useReaderController` stays within hotspot limits and project setup paths stay deduplicated, or the hook is clearly split further.
- `npm run test:frontend` passes.

## Phase 5: Extract Backend Task Registry — DONE

**Landed:** `tts-server/application/task_registry.py` — task maps, cancel/wait/shutdown helpers.

**Remaining:** ensure new render code uses the registry instead of ad-hoc task maps; thin `JobService` pass-throughs where safe.

<details>
<summary>Original playbook (historical)</summary>

Target was: task registry with no knowledge of TTS runtimes, project storage, or FastAPI.

Exit criteria met: registry exists and is wired from `JobService`.

</details>

## Phase 6: Split Backend Render Use Cases Behind A Facade — PARTIAL

**Landed:**

- `legacy_render_service.py` — legacy `/api/render` jobs
- `project_render_service.py` — project render orchestration
- `audio_assembly.py` — final audio assembly
- `job_service.py` — facade preserving public methods for `http.py` and tests

**Remaining:**

- Remove redundant delegate methods from `JobService` as callers move to services directly (only when tests and `http.py` stay stable).
- Confirm Graphify degree for `JobService` drops after the next split patch.

<details>
<summary>Original playbook (historical)</summary>

Problem: one service owned legacy jobs and project rendering.

Target modules listed above — most exist; work left is thinning the facade and deleting duplication.

</details>

## Phase 7: Move Project Policy Out Of ProjectStore

Problem being solved:

`ProjectStore` is infrastructure but owns policy:

- cache key construction
- block reuse decisions
- timeline recomputation
- readiness/status fields
- `get_project()` saves as a side effect

Target:

- Create pure domain/application helpers:
  - `build_project_cache_key`
  - `build_synced_project_blocks`
  - `recompute_project_timeline`
  - `project_progress`
- Keep `ProjectStore` responsible for:
  - read JSON
  - write JSON
  - list project summaries
  - delete project directories
  - save/read audio file paths
  - legacy storage cleanup

Important:

- Do not remove migration/defaulting from `_read_project_file` until old project JSON compatibility is explicitly covered.
- Make read-time normalization explicit. If a loaded project needs migration, call it `load_project_with_migration` or similar rather than hiding writes in `get_project`.

Exit criteria:

- Timeline/cache helpers have tests without filesystem access.
- A plain read does not unexpectedly rewrite project JSON.
- Backend tests pass.

## Phase 8: Slim HTTP Presentation — PARTIAL

**Landed:** `serializers.py`, `http_models.py`, `dependencies.py`, `provider_helpers.py` extracted from the monolithic factory.

**Remaining:**

- Move any render workflow decisions still sitting in route handlers into application services.
- Keep shrinking `create_app()` / route registration in `http.py` (hotspot limit 280).

<details>
<summary>Original playbook (historical)</summary>

Target was: route handlers validate → call application → serialize; factory easy to scan.

Partial serializers/dependency split is done; route density remains.

</details>

## Phase 9: Ratchet Enforcement

Only after the relevant files are below target:

- Update `scripts/check-architecture.mjs` to enforce:
  - frontend UI max LOC
  - frontend application max LOC
  - backend app/infrastructure max LOC
  - forbidden tokens by layer where practical
- Add a temporary allowlist only for explicitly named legacy files, with comments pointing to this playbook.
- Remove allowlist entries as each file is cleaned.

Exit criteria:

- `npm run check:architecture` catches new violations.
- `npm run verify` passes.
- Rebuild Graphify and confirm the former god nodes are reduced or at least split into named responsibilities.

## Stop Conditions

Stop and reassess if any of these happen:

- A patch requires changing UI, frontend application, backend application, and persistence at once.
- A new helper needs knowledge of both audio object URLs and project storage.
- A "domain" helper needs browser, filesystem, FastAPI, torch, or time-based side effects.
- A "store" or "service" starts taking more than five unrelated collaborators.
- Tests require excessive mocking because the extracted unit still does too much.
- The compatibility facade grows new behavior instead of delegating existing behavior.

## What Not To Do

- Do not introduce Zustand or a new state library just to imitate another project. This repo already has reducer/actions and the problem is responsibility boundaries, not missing tooling.
- Do not create generic `utils`, `helpers`, `shared`, or `common` folders.
- Do not split by noun only. Split by reason to change: polling, audio lifecycle, project preparation, task registry, project persistence.
- Do not tighten guards before the files can pass them; that creates noise instead of leverage.
- Do not rely on Graphify inferred edges as facts without source confirmation.

## Minimal Next Step

Phases 1–3 and 5 are landed. Safest **next** runtime refactors:

1. **Phase 4** — deduplicate project hydration in `useReaderController` (`applyProjectToReaderState` or equivalent).
2. **Phase 7** — extract pure timeline/cache helpers from `ProjectStore` with filesystem-free tests.
3. Run `npm run check:architecture`, `npm run test:frontend`, and `npm run test:backend` after each patch.

Do not restart phase 1–3 extractions — those modules already exist.

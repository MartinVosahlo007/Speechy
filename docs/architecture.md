# Architecture

This document defines where code belongs, what must not mix, and how to decide where new code goes.

## Scaffold Shape

Current repo layout (not an ideal-only diagram):

```
├── src/
│   ├── app/                        # Next.js App Router (thin entrypoints only)
│   │   ├── page.tsx                # <= 20 LOC, delegates to feature UI
│   │   ├── layout.tsx              # App shell, providers, theme
│   │   ├── globals.css
│   │   └── api/                    # Next.js routes (AI agent proxy, debug log)
│   │       └── agent/              # chat, models, status
│   ├── components/ui/              # shadcn primitives only — no domain logic
│   ├── features/
│   │   └── reader/                 # Feature folder: one per bounded context
│   │       ├── domain/             # Pure logic, zero side effects
│   │       ├── application/        # Use-case orchestration, hooks, reducers
│   │       ├── infrastructure/     # External adapters (API, audio, storage, LLM)
│   │       └── ui/                 # React components (dumb presentation)
│   ├── hooks/                      # Global hooks (currently only shadcn toast)
│   └── lib/                        # shadcn cn() + thin re-exports only
├── desktop/                        # Electron main/preload (Windows shell)
├── tts-server/
│   ├── server.py                   # <= 20 LOC, wires FastAPI app
│   ├── presentation/               # HTTP routes, models, serializers, dependencies
│   ├── application/                # Job facade, render services, provider registry
│   │   ├── job_service.py          # Facade delegating legacy + project render paths
│   │   ├── legacy_render_service.py
│   │   ├── project_render_service.py
│   │   ├── provider_registry.py
│   │   └── task_registry.py
│   ├── domain/                     # Pure logic (chunking, types, provider types)
│   ├── infrastructure/             # GPU, voice store, project store, providers/
│   │   ├── providers/              # OmniVoiceRuntime, SupertonicRuntime
│   │   └── xtts_runtime.py         # Compatibility alias → OmniVoiceRuntime
│   └── tests/
├── docs/
│   ├── README.md                   # Documentation map
│   ├── KONCEPCNI_SPECIFIKACE.md    # Product + technology overview (Czech)
│   ├── ai-workflow.md              # AI skills and process
│   ├── constitution.md             # Non-overridable rules
│   ├── architecture.md             # This file
│   ├── governance.md               # Change process & protected area
│   └── architecture/REFACTOR_PLAN.md
├── graphify-out/
│   └── GRAPH_REPORT.md             # Tracked audit report (other files are generated cache)
├── .codex/skills/                  # Project AI skills (historical folder name; Cursor reads these)
├── .cursor/rules/                  # Cursor IDE rules
├── scripts/
│   ├── check-architecture.mjs      # Hotspot LOC limits + layer import boundaries
│   ├── check-governance.mjs        # Governance record requirement for protected files
│   ├── dev-up.mjs                  # Dev startup (frontend + backend)
│   └── run-with-log.mjs
├── uklid.bat                       # Safe local disk cleanup
├── spustit-aplikaci.bat            # Dev startup (frontend + backend)
├── .github/workflows/ci.yml
└── AGENTS.md                       # Short agent entrypoint → docs/
```

## Hotspot Limits (source of truth)

Automated ceilings live in `scripts/check-architecture.mjs`. Run `npm run check:architecture` before claiming a hotspot is clean.

| File | Limit (lines) |
|------|---------------|
| `src/app/page.tsx` | 20 |
| `tts-server/server.py` | 20 |
| `src/features/reader/application/useReaderController.ts` | 230 |
| `src/features/reader/application/useLongFormPlaybackSession.ts` | 420 |
| `tts-server/infrastructure/project_store.py` | 250 |
| `tts-server/presentation/http.py` | 280 |

General category limits (UI, application, domain, function size) are in [constitution.md](constitution.md) §8.

## Layer Boundaries — Frontend

```
ui ──→ application ──→ domain
                    ──→ infrastructure ──→ domain
```

| From        | May import                          | May NOT import           |
|-------------|--------------------------------------|--------------------------|
| `ui`        | `ui`, `application`, `domain`        | `infrastructure`         |
| `application` | `domain`, `infrastructure`, `application` | `ui`           |
| `infrastructure` | `domain`, `infrastructure`        | `application`, `ui`      |
| `domain`    | `domain` only                        | `ui`, `application`, `infrastructure` |

## Layer Boundaries — Backend

```
presentation ──→ application ──→ domain
             ──→ infrastructure ──→ domain
```

| From           | May import                                    | May NOT import           |
|----------------|-----------------------------------------------|--------------------------|
| `presentation` | `application`, `domain`, `infrastructure`    | —                        |
| `application`  | `domain`, `infrastructure`, `application`     | `presentation`           |
| `infrastructure` | `domain`, `infrastructure`                 | `application`, `presentation` |
| `domain`       | `domain` only                                 | `application`, `presentation`, `infrastructure` |

## Where New Code Goes

1. **Is it a pure calculation or type?** → `domain/`
2. **Does it call an external system (API, filesystem, GPU)?** → `infrastructure/`
3. **Does it coordinate domain + infrastructure for a use case?** → `application/`
4. **Is it a React component or HTTP route?** → `ui/` or `presentation/`
5. **Is it a new feature?** → Create a new folder under `src/features/<name>/` with the four layers

### Shared Helpers

There are no shared utility files. If two features need the same function, extract it into `domain/` within the feature that owns it. If it is genuinely cross-cutting (like `cn()` for CSS), it may live in `src/lib/utils.ts` — but this file must not grow beyond 10 LOC.

## What Must Not Mix

- **Domain code must not import infrastructure or application.** Domain is the innermost layer and must be testable in isolation.
- **UI must not import infrastructure or own workflow logic.** All side effects flow through application-layer hooks. UI can keep local visual state such as hover, menus, focus, and pending input text, but cannot own API calls, audio lifecycle, polling, project synchronization, or workflow transitions.
- **Application is not a dumping ground.** Application code coordinates use cases, but long-running workflows must be split by responsibility before a hook/service becomes a second UI layer with hidden mutable state.
- **Infrastructure provides capabilities, not policy.** API clients, stores, audio adapters, filesystem adapters, and model runtimes should not decide reader or project workflow rules.
- **No business logic in entrypoints.** `page.tsx` and `server.py` wire only.
- **No domain logic in `src/lib/` or `src/hooks/`.** These are shadcn scaffolding only. `src/lib/chunking.ts` is a thin re-export of `src/features/reader/domain/chunking` — new code must import from `domain/chunking` directly.
- **No side effects in `src/hooks/use-toast.ts`.** The existing file is shadcn-generated and contains side effects (timers, dispatch). It is grandfathered but must not be extended with domain logic.

## Existing Debt Is Not Precedent

Known architecture debts. Touch these files only to reduce debt, isolate behavior, or add characterization tests before extraction. Whether a file is under its hotspot limit: `npm run check:architecture`.

- `src/features/reader/application/useLongFormPlaybackSession.ts` (hotspot limit 420): composes preparation, polling, and audio hooks, but still owns playback transition wiring.
- `src/features/reader/application/useReaderController.ts` (hotspot limit 230): central reader wiring; duplicated project hydration paths remain a refactor target ([REFACTOR_PLAN.md](architecture/REFACTOR_PLAN.md) phase 4).
- `tts-server/application/job_service.py`: facade that delegates to `LegacyRenderService` and `ProjectRenderService`; many thin pass-through methods remain.
- `tts-server/infrastructure/project_store.py` (hotspot limit 250): persistence mixed with cache/timeline/status policy.
- `tts-server/presentation/http.py` (hotspot limit 280): route factory still composes dependencies and many routes.

Do not add new behavior to these files unless the change also makes the relevant responsibility smaller or better tested.

## Refactor Direction

Frontend target flow:

```
ui component -> application controller/hook -> domain rule
                                      -> infrastructure adapter
```

Backend target flow:

```
presentation route -> application use case -> domain rule
                                      -> infrastructure adapter
```

The direction is inward for rules and outward for effects. UI and HTTP routes translate user/API events into application calls; domain decides pure policy; infrastructure performs effects only when application asks it to.

## Refactor-Before-Extend Triggers

When any of these conditions are true, you must refactor before adding new features:

1. A file exceeds its LOC limit (see constitution §8 and `scripts/check-architecture.mjs`)
2. A module has more than one reason to change
3. An import boundary is violated
4. A dumping-ground name appears (`utils/`, `helpers/`, `common/`, `misc/`, `shared/`, `base/`)
5. A function exceeds 60 LOC

# Repository Guidelines

Mapa veškeré dokumentace: [docs/README.md](docs/README.md). Workflow pro AI: [docs/ai-workflow.md](docs/ai-workflow.md).

## Project Structure & Module Organization

The main app lives in `src/` (Next.js App Router). Reader code: `src/features/reader/` (`domain`, `application`, `infrastructure`, `ui`). TTS backend entrypoint: `tts-server/server.py` (`presentation`, `application`, `domain`, `infrastructure`).

## Target Architecture & Layer Rules

Strict layer separation. Violations in existing files are refactor debt, not precedent.

**Frontend:** `ui` → `application` → `domain`; `application` → `infrastructure` → `domain`. UI: presentation only (no API, storage, polling). Application: orchestration. Domain: pure logic. Infrastructure: effects only.

**Backend:** `presentation` → `application` → `domain`; `application` → `infrastructure` → `domain`.

Full import matrix and debt list: [docs/architecture.md](docs/architecture.md) (includes hotspot table from `scripts/check-architecture.mjs`). Refactor playbook: [docs/architecture/REFACTOR_PLAN.md](docs/architecture/REFACTOR_PLAN.md).

## Build, Test, and Development Commands

- `npm run dev` — Next.js on port 3417 (`dev.log`)
- `npm run build` — production standalone under `.next/standalone`
- `npm run start` — production server from standalone
- `npm run lint` — ESLint + architecture + governance checks
- `npm run test:frontend` / `npm run test:backend` / `npm run test`
- `npm run verify` — full gate
- `spustit-aplikaci.bat` or `node scripts/dev-up.mjs` — frontend + backend (3417 / 18100)
- `cd tts-server && python server.py` — backend only (18100)
- `uklid.bat` — safe cleanup of build cache (see README)

## Local Git Note

On Windows, use `C:\Program Files\Git\cmd\git.exe` if `git` is not in PATH.

## Coding Style & Naming

2-space indent. TypeScript: `PascalCase` components, `camelCase` hooks/functions. Tailwind in UI; shadcn primitives in `src/components/ui/` only.

## Testing

`npm run test` + manual reading flow + `http://localhost:18100/api/health`. Frontend tests: `*.test.ts` under `src/features/reader/`.

## Commit & Pull Request

Short imperative subjects. PR: summary, affected areas, manual steps, screenshots for UI.

## Configuration

Secrets in `.env` only. TTS URL: `NEXT_PUBLIC_TTS_API_BASE_URL` (default `http://localhost:18100`).

## Knowledge Graph (Graphify)

Skill (full `/graphify` pipeline): [.codex/skills/graphify/SKILL.md](.codex/skills/graphify/SKILL.md). Cursor rule: [.cursor/rules/graphify.mdc](.cursor/rules/graphify.mdc).

Tracked report: [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md). Use before broad architecture work; skip for narrow edits.

- `npm run graphify:query -- "question"`
- `npm run graphify:explain -- "ComponentName"`
- `npm run graphify:path -- "A" "B"`
- `npm run graphify:build` or `graphify update .` after code changes

Generated artifacts (`graph.json`, `graph.html`) are gitignored; only `GRAPH_REPORT.md` is tracked. Treat `INFERRED` edges as leads to verify in source.

## Project AI Skills & Workflow

Project skills live in [.codex/skills/README.md](.codex/skills/README.md) (folder name is historical; Cursor is the primary IDE). Default policy: `karpathy-guidelines` + `pragmatic-superpowers` in [docs/ai-workflow.md](docs/ai-workflow.md).

Non-programmer operator: plain language, minimal scope, no speculative refactors.

## Protected Rules

Changing [docs/constitution.md](docs/constitution.md), [docs/architecture.md](docs/architecture.md), [docs/governance.md](docs/governance.md), or this file requires a governance record per [docs/governance.md](docs/governance.md).

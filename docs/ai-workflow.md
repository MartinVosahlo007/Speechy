# AI workflow v tomto repozitáři

Jak pracovat v Speechy bez zbytečné ceremonie. Detailní pravidla vrstev jsou v [constitution.md](constitution.md) a [architecture.md](architecture.md).

## Výchozí postup

1. Přečíst [docs/README.md](README.md) — najít správný dokument.
2. U architektury / refaktoru: [graphify-out/GRAPH_REPORT.md](../graphify-out/GRAPH_REPORT.md), pak cíleně zdrojáky.
3. Dodržet skill [karpathy-guidelines](../.codex/skills/karpathy-guidelines/SKILL.md): malý diff, ověření reálnými příkazy.
4. V závěru napsat, co bylo ověřeno (`npm run test:frontend`, `lint`, …) a co ne.

## Kdy který skill

| Situace | Skill |
|---------|--------|
| Implementace, bugfix, refactor | `karpathy-guidelines` |
| Má se spouštět brainstorming / TDD / dlouhý debug? | `pragmatic-superpowers` |
| Code review, bezpečnost | `code-reviewer` |
| FastAPI endpointy, Pydantic | `fastapi-expert` |
| React výkon, komponenty | `react-best-practices` |
| Mapa kódu / architektura | `graphify` |

Globální Cursor skills (mimo repo) se používají jen když uživatel výslovně požádá — ne automaticky na každou zprávu.

## Pragmatická pravidla (shrnutí)

**Nepouštět těžký proces** pro pozdrav, překlad, jednoduchou úpravu textu, úklid souborů.

**Brainstorming** jen když:
- uživatel chce nápady nebo směr produktu,
- zadání je nejednoznačné a změní implementaci,
- nová funkce má významné trade-offy.

**Systematic debugging** jen při reálném selhání: padající testy, build, runtime bug.

**TDD** u chování v `src/features/reader/` a `tts-server/` — preferované, ne povinné u copy/stylů.

**Verification before completion** — po změně kódu neprohlašovat „hotovo“ bez relevantního příkazu z repa.

## Graphify

Skill: [.codex/skills/graphify/SKILL.md](../.codex/skills/graphify/SKILL.md). Cursor: [.cursor/rules/graphify.mdc](../.cursor/rules/graphify.mdc). Mapa docs: [docs/README.md](README.md).

- Architektura / závislosti: nejdřív `graphify-out/GRAPH_REPORT.md`, pak `npm run graphify:query -- "otázka"`.
- Cesta mezi moduly: `npm run graphify:path -- "JobService" "ProjectStore"`.
- Hotspot limity: `npm run check:architecture` (viz [architecture.md](architecture.md)).
- Úzký úkol se známým souborem: Graphify přeskočit.
- Po změně kódu: `npm run graphify:build` nebo `graphify update .`.

## Uživatel není programátor

- Vysvětlení jednoduše, bez hromady identifikátorů.
- Jedna důležitá otázka najednou.
- Žádné spekulativní refactory mimo zadání.

## Cursor

Projektové pravidlo: [.cursor/rules/speechy.mdc](../.cursor/rules/speechy.mdc) → [AGENTS.md](../AGENTS.md) a tato mapa docs.

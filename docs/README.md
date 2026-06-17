# Dokumentace Speechy

Jedna mapa — kam co patří a co je aktuální.

## Pro lidi (provoz aplikace)

| Dokument | Účel |
|----------|------|
| [KONCEPCNI_SPECIFIKACE.md](KONCEPCNI_SPECIFIKACE.md) | Co aplikace je, co umí, jaké technologie používá (s odkazy) |
| [README.md](../README.md) | Instalace, spuštění, FFmpeg, hlasy, desktop, AI agent |
| [uklid.bat](../uklid.bat) | Bezpečný úklid cache a buildů na disku |
| [spustit-aplikaci.bat](../spustit-aplikaci.bat) | Spuštění frontend + backend ve vývoji |

## Pro vývojáře a AI (pravidla a architektura)

| Dokument | Účel | Měnit jen s governance záznamem |
|----------|------|--------------------------------|
| [AGENTS.md](../AGENTS.md) | Stručný provozní manuál pro Cursor / AI agenty | Ano |
| [constitution.md](constitution.md) | Neměnná pravidla vrstev, LOC, zákazy | Ano |
| [architecture.md](architecture.md) | Kam patří nový kód, importy, dluh, hotspot limity | Ano |
| [governance.md](governance.md) | Jak měnit chráněné soubory, CI, limity PR | Ano |
| [ai-workflow.md](ai-workflow.md) | Kdy použít který skill / proces | Ne |
| [architecture/REFACTOR_PLAN.md](architecture/REFACTOR_PLAN.md) | Postup refaktoru hotspotů (hotové fáze + backlog) | Ne |

## Skills a Graphify

Projektové AI skills jsou ve složce [`.codex/skills/`](../.codex/skills/) (historický název cesty — dnes je používá **Cursor**). Codex hooky a konfigurace Windsurf/Kilo v repu nejsou.

| Skill | Kdy |
|-------|-----|
| [karpathy-guidelines](../.codex/skills/karpathy-guidelines/SKILL.md) | Vždy při psaní/refaktoru kódu |
| [pragmatic-superpowers](../.codex/skills/pragmatic-superpowers/SKILL.md) | Rozhodnutí, zda spouštět těžké procesy |
| [code-reviewer](../.codex/skills/code-reviewer/SKILL.md) | Review, bezpečnost |
| [fastapi-expert](../.codex/skills/fastapi-expert/SKILL.md) | Backend API / FastAPI |
| [react-best-practices](../.codex/skills/react-best-practices/SKILL.md) | React výkon, komponenty |
| [graphify](../.codex/skills/graphify/SKILL.md) | Mapa kódu: build, query, path, explain |

Podrobnosti workflow: [ai-workflow.md](ai-workflow.md).

**Graphify v praxi**

- Cursor pravidlo: [.cursor/rules/graphify.mdc](../.cursor/rules/graphify.mdc)
- Sledovaný report: [graphify-out/GRAPH_REPORT.md](../graphify-out/GRAPH_REPORT.md)
- Příkazy: `npm run graphify:query`, `graphify:explain`, `graphify:path`, `graphify:build`
- Po změně kódu: `npm run graphify:build` nebo `graphify update .`

## Governance záznamy

- Log změn pravidel: [governance.md](governance.md) (sekce Change Log)
- Kompatibilita pro CI: [.governance/GOVERNANCE_CHANGE.md](../.governance/GOVERNANCE_CHANGE.md)

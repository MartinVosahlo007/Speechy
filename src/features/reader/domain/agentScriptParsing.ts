import type { AgentScriptBlock } from "./agentLlmTypes";

export type AgentVoiceInput = { name: string; transcript?: string | null };

const MAX_TRANSCRIPT_PREVIEW = 240;

export function buildAgentSystemPrompt(voices: AgentVoiceInput[], defaultVoice: string) {
  const voiceLines = voices
    .map((voice) => {
      const sample = voice.transcript
        ? ` — ukázka: "${voice.transcript.slice(0, MAX_TRANSCRIPT_PREVIEW).replace(/\s+/g, " ").trim()}"`
        : "";
      return `- ${voice.name}${sample}`;
    })
    .join("\n");

  return [
    "Jsi český kreativní asistent pro tvorbu audio scénářů v aplikaci Speechy.",
    "Vedeš s uživatelem přirozenou konverzaci v češtině. Uživatel ti může poslat text, brief, nebo přiložit soubor a chtít po tobě cokoli — návrhy, úpravy, převod do scénáře.",
    "Když uživatel jasně chce hotový scénář k převedení do audia (např. \"napiš scénář\", \"vytvoř to\", \"použij to v projektu\"), vrať v odpovědi blok kódu označený jako json obsahující objekt:",
    '{"action":"script","blocks":[{"text":"...","voice":"jmeno_hlasu"}]}',
    "Tento blok kódu může být doplněn krátkým komentářem nad nebo pod ním. Bez tohoto bloku se scénář do projektu nezaloží.",
    "",
    "Pravidla pro scénář:",
    "1) Každá replika postavy nebo vypravěčská pasáž je samostatný blok.",
    "2) Stejná postava má v celém scénáři stejný hlas.",
    "3) Pole \"voice\" musí být PŘESNĚ jedno ze jmen v seznamu hlasů níže.",
    "4) Pro neutrální vypravěčské pasáže použij výchozí hlas, pokud žádný nesedí lépe.",
    "5) Když uživatel poslal hotový text, NEPŘEPISUJ ho — jen ho rozděl a přiřaď hlasy. Když máš text vymyslet, piš česky.",
    "",
    `Výchozí hlas: ${defaultVoice || "(žádný)"}`,
    "Dostupné hlasy:",
    voiceLines || "(žádné)",
  ].join("\n");
}

export function extractAgentScriptBlocks(
  content: string,
  voiceNames: Set<string>,
  defaultVoice: string,
): { messageText: string; blocks: AgentScriptBlock[] | null } {
  const fenced = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  const candidates: string[] = [];
  if (fenced) candidates.push(fenced[1]);
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) candidates.push(trimmed);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { action?: unknown }).action === "script" &&
        Array.isArray((parsed as { blocks?: unknown }).blocks)
      ) {
        const blocks = ((parsed as { blocks: unknown[] }).blocks)
          .map((entry): AgentScriptBlock => {
            const c = entry as { text?: unknown; voice?: unknown };
            const text = typeof c.text === "string" ? c.text.trim() : "";
            const voiceRaw = typeof c.voice === "string" ? c.voice.trim() : "";
            const voice = voiceNames.has(voiceRaw) ? voiceRaw : defaultVoice;
            return { text, voice };
          })
          .filter((block) => block.text.length > 0);
        if (!blocks.length) continue;

        let messageText = content;
        if (fenced) messageText = content.replace(fenced[0], "").trim();
        else messageText = "";
        return { messageText, blocks };
      }
    } catch {
      // ignore parse failures
    }
  }

  return { messageText: content.trim(), blocks: null };
}

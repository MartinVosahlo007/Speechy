export function normalizeOpenRouterApiKey(value: unknown): string {
  let key = String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  key = key.replace(/^authorization\s*:\s*/i, "").trim();
  key = key.replace(/^bearer\s+/i, "").trim();
  key = key.replace(/^['"]|['"]$/g, "").trim();
  key = key.replace(/\s+/g, "");

  return key;
}

export function looksLikeOpenRouterKey(key: unknown): boolean {
  return /^sk-or-[A-Za-z0-9_-]+/.test(String(key || ""));
}

export function maskApiKey(key: unknown): string {
  const clean = normalizeOpenRouterApiKey(key);
  if (!clean) return "not set";
  if (clean.length <= 10) return "***";
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

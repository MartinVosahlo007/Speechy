type DebugPayload = {
  location: string;
  message: string;
  data: Record<string, unknown>;
  hypothesisId: string;
};

const INGEST_URL = "http://127.0.0.1:7336/ingest/95c422d5-4260-40b9-b066-af5e195ce079";

export function debugSessionLog(payload: DebugPayload) {
  const body = JSON.stringify({ sessionId: "26eaee", timestamp: Date.now(), ...payload });
  // #region agent log
  void fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "26eaee" },
    body,
  }).catch(() => {});
  void fetch("/api/debug-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
  // #endregion
}

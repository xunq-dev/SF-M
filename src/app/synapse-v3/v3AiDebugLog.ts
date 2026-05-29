export type AiDebugLogEntry = {
  at: string;
  type: string;
  detail: Record<string, unknown>;
};

const entries: AiDebugLogEntry[] = [];
const MAX_ENTRIES = 600;

export function logAiDebug(type: string, detail: Record<string, unknown> = {}) {
  entries.push({
    at: new Date().toISOString(),
    type,
    detail,
  });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

export function formatAiDebugLog(): string {
  const lines = [
    "=== SynapseAI Debug Log ===",
    `exported: ${new Date().toISOString()}`,
    `entries: ${entries.length}`,
    "",
  ];
  for (const entry of entries) {
    lines.push(`[${entry.at}] ${entry.type}`);
    lines.push(JSON.stringify(entry.detail, null, 2));
    lines.push("");
  }
  return lines.join("\n");
}

export function clearAiDebugLog() {
  entries.length = 0;
}

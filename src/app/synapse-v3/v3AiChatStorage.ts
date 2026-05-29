import type { AiChatMessage } from "./v3AiProviders";

export type { AiChatMessage };

export type AiChatSession = {
  id: string;
  tabId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AiChatMessage[];
};

export type TabChatState = {
  activeSessionId: string;
  sessions: AiChatSession[];
};

const STORAGE_KEY = "synapse.v3AiChatHistory.v1";
const MAX_SESSIONS_PER_TAB = 30;
const MAX_MESSAGES_PER_SESSION = 200;

function newSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readAll(): Record<string, TabChatState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, TabChatState>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, TabChatState>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createEmptySession(tabId: string, title = "New chat"): AiChatSession {
  const now = Date.now();
  return {
    id: newSessionId(),
    tabId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function loadTabChatState(tabId: string): TabChatState {
  const all = readAll();
  const existing = all[tabId];
  if (existing?.activeSessionId && existing.sessions?.length) {
    return existing;
  }
  const session = createEmptySession(tabId);
  return { activeSessionId: session.id, sessions: [session] };
}

export function saveTabChatState(tabId: string, state: TabChatState): void {
  const sessions = state.sessions
    .slice(0, MAX_SESSIONS_PER_TAB)
    .map((s) => ({
      ...s,
      messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION),
    }));
  const all = readAll();
  all[tabId] = { ...state, sessions };
  writeAll(all);
}

export function getActiveSession(state: TabChatState): AiChatSession | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

export function upsertActiveSession(
  state: TabChatState,
  updater: (session: AiChatSession) => AiChatSession,
): TabChatState {
  const sessions = state.sessions.map((s) =>
    s.id === state.activeSessionId ? updater(s) : s,
  );
  return { ...state, sessions };
}

export function startNewChatSession(tabId: string, state: TabChatState): TabChatState {
  const session = createEmptySession(tabId);
  const sessions = [session, ...state.sessions.filter((s) => s.messages.length > 0)].slice(
    0,
    MAX_SESSIONS_PER_TAB,
  );
  return { activeSessionId: session.id, sessions };
}

export function selectChatSession(state: TabChatState, sessionId: string): TabChatState {
  if (!state.sessions.some((s) => s.id === sessionId)) return state;
  return { ...state, activeSessionId: sessionId };
}

export function deleteChatSession(state: TabChatState, sessionId: string): TabChatState {
  const sessions = state.sessions.filter((s) => s.id !== sessionId);
  if (!sessions.length) {
    const fresh = createEmptySession(state.sessions[0]?.tabId ?? "unknown");
    return { activeSessionId: fresh.id, sessions: [fresh] };
  }
  const activeSessionId =
    state.activeSessionId === sessionId ? sessions[0]!.id : state.activeSessionId;
  return { activeSessionId, sessions };
}

export function clearAllChatSessions(tabId: string): TabChatState {
  const fresh = createEmptySession(tabId);
  return { activeSessionId: fresh.id, sessions: [fresh] };
}

export function sessionTitleFromMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

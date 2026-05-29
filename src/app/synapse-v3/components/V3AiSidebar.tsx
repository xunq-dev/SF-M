import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { History } from "lucide-react";
import {
  V3_AI_PROVIDER_LABELS,
  useV3AiSettings,
} from "../v3AiSettings";
import { useV3AiChat } from "../useV3AiChat";
import { formatRelativeTime } from "../v3AiChatStorage";
import { formatAiDebugLog } from "../v3AiDebugLog";
import { useEditorAiProposals } from "../EditorAiProposalContext";
import { V3FluentIcon } from "./V3FluentIcon";
import type { V3Page } from "../v3PageTypes";

const API_KEY_BANNER_BG = "#c44b00";

type V3AiSidebarProps = {
  top: number;
  tabId: string;
  tabTitle: string;
  scriptContent: string;
  diskPath?: string;
  onClose: () => void;
  onNavigate: (page: V3Page) => void;
};

function AssistantMessage({
  content,
  thinking,
  editProposalIds,
  defaultThinkingOpen,
}: {
  content: string;
  thinking?: string;
  editProposalIds?: string[];
  defaultThinkingOpen?: boolean;
}) {
  const [thinkingOpen, setThinkingOpen] = useState(defaultThinkingOpen ?? false);
  const hasThinking = Boolean(thinking?.trim());
  const hasContent = Boolean(content?.trim());
  const editCount = editProposalIds?.length ?? 0;

  return (
    <div
      className="rounded-[4px] px-2.5 py-2 self-start min-w-0"
      data-v3-live="aiSidebar.messageAssistantBg"
      style={{
        maxWidth: "92%",
        background: "var(--v3-ai-message-assistant-bg, #1e1e1e)",
        border: "1px solid var(--v3-ai-message-border, rgba(255,255,255,0.06))",
      }}
    >
      {editCount > 0 ? (
        <p
          className="mb-2"
          data-v3-live="aiSidebar.accentText"
          style={{
            fontSize: 10,
            fontFamily: "Inter, sans-serif",
            color: "var(--v3-ai-accent-text, #eab308)",
          }}
        >
          {editCount} editor edit{editCount === 1 ? "" : "s"} proposed
        </p>
      ) : null}
      {hasThinking ? (
        <div className="mb-2">
          <button
            type="button"
            className="flex items-center gap-1 hover:opacity-80 transition-opacity w-full text-left"
            onClick={() => setThinkingOpen((v) => !v)}
          >
            <svg
              viewBox="0 0 12 12"
              width={10}
              height={10}
              fill="none"
              data-v3-live="aiSidebar.iconMuted"
              style={{
                transform: thinkingOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
                color: "var(--v3-ai-icon-muted, #6f6f6e)",
              }}
            >
              <path
                d="M4 2L9 6L4 10"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: 10,
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-ai-icon-muted, #6f6f6e)",
              }}
            >
              Thinking
            </span>
          </button>
          {thinkingOpen ? (
            <pre
              className="mt-1 whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto"
              style={{
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                lineHeight: 1.4,
                color: "var(--v3-ai-icon-muted, #8a8a89)",
              }}
            >
              {thinking}
            </pre>
          ) : null}
        </div>
      ) : null}
      {hasContent ? (
        <p
          className="whitespace-pre-wrap break-words"
          data-v3-live="aiSidebar.headerText"
          style={{
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.45,
            color: "var(--v3-ai-header-text, #ffffff)",
          }}
        >
          {content}
        </p>
      ) : editCount > 0 ? (
        <p
          style={{
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.45,
            color: "var(--v3-ai-header-text, #ffffff)",
          }}
        >
          Review the highlighted changes in the editor.
        </p>
      ) : !hasThinking ? (
        <p
          style={{
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.45,
            color: "var(--v3-ai-icon-muted, #6f6f6e)",
          }}
        >
          …
        </p>
      ) : null}
    </div>
  );
}

function QuickActionRow(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex w-full shrink-0 items-start gap-2 border-b border-solid px-2 py-2.5"
      style={{
        borderColor: "var(--v3-ai-panel-border, rgba(255,255,255,0.08))",
        background: "var(--v3-settings-control-bg, #373737)",
      }}
    >
      <div
        className="mt-0.5 flex shrink-0 items-center justify-center"
        style={{ color: "var(--v3-ai-icon-muted, #868686)" }}
      >
        {props.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          style={{
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            lineHeight: 1.25,
            color: "var(--v3-settings-label, #ffffff)",
          }}
        >
          {props.title}
        </p>
        <p
          className="mt-0.5"
          style={{
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            lineHeight: 1.35,
            color: "var(--v3-settings-desc, #6b6b6b)",
          }}
        >
          {props.description}
        </p>
      </div>
      <button
        type="button"
        disabled={props.disabled}
        className="shrink-0 self-center px-1 hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
          color: "var(--v3-accent-muted, #b0d8e5)",
        }}
        onClick={props.onAction}
      >
        {props.actionLabel}
      </button>
    </div>
  );
}

export function V3AiSidebar({
  top,
  tabId,
  tabTitle,
  scriptContent,
  diskPath,
  onClose,
  onNavigate,
}: V3AiSidebarProps) {
  const aiSettings = useV3AiSettings();
  const { hasPendingProposals } = useEditorAiProposals();
  const {
    messages,
    sessions,
    activeSessionId,
    isLoading,
    error,
    streamingThinking,
    streamingContent,
    streamingToolLabel,
    agentRound,
    send,
    newChat,
    selectSession,
    deleteSession,
    clearAllChats,
    clearError,
  } = useV3AiChat({ tabId, tabTitle, scriptContent, diskPath });

  const [draft, setDraft] = useState("");
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [copyLabel, setCopyLabel] = useState<"Copy error" | "Copied">("Copy error");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [debugCopyLabel, setDebugCopyLabel] = useState<string | null>(null);
  const titleClickTimesRef = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setErrorExpanded(false);
    setCopyLabel("Copy error");
  }, [error]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, streamingContent, streamingThinking]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [draft, resizeTextarea]);

  const handleSend = useCallback(() => {
    if (!draft.trim() || isLoading) return;
    const text = draft;
    setDraft("");
    void send(text);
  }, [draft, isLoading, send]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyError = useCallback(async () => {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(error);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy error"), 1500);
    } catch {
      /* ignore */
    }
  }, [error]);

  const handleTitleClick = useCallback(async () => {
    const now = Date.now();
    titleClickTimesRef.current = titleClickTimesRef.current.filter((t) => now - t < 5000);
    titleClickTimesRef.current.push(now);
    if (titleClickTimesRef.current.length < 5) return;
    titleClickTimesRef.current = [];
    try {
      await navigator.clipboard.writeText(formatAiDebugLog());
      setDebugCopyLabel("Debug log copied");
      window.setTimeout(() => setDebugCopyLabel(null), 2000);
    } catch {
      setDebugCopyLabel("Copy failed");
      window.setTimeout(() => setDebugCopyLabel(null), 2000);
    }
  }, []);

  const handleClearClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (e.shiftKey) {
        clearAllChats();
      } else {
        newChat();
      }
    },
    [clearAllChats, newChat],
  );

  const focusCompose = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const providerLabel = V3_AI_PROVIDER_LABELS[aiSettings.provider];
  const hasApiKey = Boolean(aiSettings.apiKeys[aiSettings.provider]?.trim());
  const pendingEdits = hasPendingProposals(tabId);
  const showQuickActions = messages.length === 0 && !isLoading;

  return (
    <div
      className="absolute flex flex-col overflow-hidden pointer-events-auto"
      data-v3-live="aiSidebar.panelBg"
      style={{
        left: 0,
        top,
        bottom: 0,
        width: 280,
        zIndex: 20,
        background: "var(--v3-ai-panel-bg, #2d2d2d)",
        boxShadow: "4px 0 20px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="shrink-0 flex items-center justify-between px-3 border-b border-solid"
        data-v3-live="aiSidebar.headerBg"
        style={{
          height: 44,
          background: "var(--v3-ai-header-bg, var(--v3-ai-panel-bg, #2d2d2d))",
          borderColor: "var(--v3-ai-panel-border, rgba(255,255,255,0.08))",
        }}
      >
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="truncate text-left hover:opacity-80 transition-opacity"
            data-v3-live="aiSidebar.headerText"
            style={{
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              letterSpacing: "0.02em",
              color: "var(--v3-ai-header-text, #ffffff)",
            }}
            title={debugCopyLabel ?? "SynapseAI"}
            onClick={() => void handleTitleClick()}
          >
            SynapseAI
          </button>
          {debugCopyLabel ? (
            <p style={{ fontSize: 9, fontFamily: "Inter, sans-serif", color: "#8fd18f" }}>
              {debugCopyLabel}
            </p>
          ) : (
            <p
              className="truncate"
              data-v3-live="aiSidebar.headerMuted"
              style={{
                fontSize: 10,
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-ai-header-muted, #6f6f6e)",
              }}
              title={tabTitle}
            >
              {tabTitle} · {providerLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" data-v3-live="aiSidebar.iconMuted">
          <button
            type="button"
            className="hover:opacity-70 transition-opacity flex items-center justify-center"
            style={{
              width: 26,
              height: 26,
              color: historyOpen ? "var(--v3-ai-header-text, #fff)" : "var(--v3-ai-icon-muted, #9a9a99)",
            }}
            title="Chat history"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <History size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="hover:opacity-70 transition-opacity flex items-center justify-center"
            style={{ width: 26, height: 26, color: "var(--v3-ai-header-text, #fff)" }}
            title="Close"
            onClick={onClose}
          >
            <svg viewBox="0 0 11 11" width={11} height={11} fill="none">
              <path
                d="M10.5 10.5L0.5 0.5M0.999999 10.5L10.5 0.500001"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {!hasApiKey ? (
        <button
          type="button"
          className="shrink-0 w-full px-3 text-left hover:brightness-110 transition-[filter]"
          style={{
            background: API_KEY_BANNER_BG,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          onClick={() => onNavigate("settings")}
        >
          <span
            className="underline"
            style={{
              fontSize: 11,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.35,
              color: "#ffffff",
            }}
          >
            An API key is necessary to use SynapseAI
          </span>
        </button>
      ) : null}

      {historyOpen ? (
        <div
          className="shrink-0 border-b border-solid overflow-y-auto max-h-[180px]"
          data-v3-live="aiSidebar.messageAssistantBg"
          style={{
            borderColor: "var(--v3-ai-panel-border, rgba(255,255,255,0.08))",
            scrollbarWidth: "thin",
          }}
        >
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-1 px-3 py-2 cursor-pointer hover:opacity-90"
              style={{
                background:
                  session.id === activeSessionId
                    ? "color-mix(in srgb, var(--v3-ai-message-assistant-bg, #1e1e1e) 70%, var(--v3-ai-header-text, #fff) 8%)"
                    : undefined,
              }}
              onClick={() => {
                selectSession(session.id);
                setHistoryOpen(false);
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter, sans-serif",
                    color: "var(--v3-ai-header-text, #fff)",
                  }}
                >
                  {session.title}
                </p>
                <p
                  style={{
                    fontSize: 9,
                    fontFamily: "Inter, sans-serif",
                    color: "var(--v3-ai-header-muted, #6f6f6e)",
                  }}
                >
                  {formatRelativeTime(session.updatedAt)} · {session.messages.length} msgs
                </p>
              </div>
              {sessions.length > 1 ? (
                <button
                  type="button"
                  className="shrink-0 opacity-50 hover:opacity-100 px-1"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col v3-ai-chat-scroll"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#444 transparent" }}
      >
        {showQuickActions ? (
          <div className="shrink-0 flex flex-col">
            <QuickActionRow
              icon={<V3FluentIcon name="bot20Filled" size={16} color="currentColor" />}
              title="Chat with SynapseAI"
              description="Talk with SynapseAI to get assistance with your script."
              actionLabel="Chat"
              onAction={focusCompose}
            />
            <QuickActionRow
              icon={<V3FluentIcon name="star24Filled" size={16} color="currentColor" />}
              title="Explain code"
              description="Add comments explaining what the code is doing."
              actionLabel="Apply"
              disabled={isLoading}
              onAction={() => void send("Add comments explaining what the code is doing.")}
            />
            <QuickActionRow
              icon={<V3FluentIcon name="textAsterisk20Filled" size={16} color="currentColor" />}
              title="Rename variables"
              description="Rename variables to names that are easier to understand."
              actionLabel="Apply"
              disabled={isLoading}
              onAction={() => void send("Rename variables to names that are easier to understand.")}
            />
          </div>
        ) : null}

        {messages.length > 0 ? (
          <div className="flex flex-col gap-2 px-3 py-3">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div
                  key={`${msg.role}-${i}`}
                  className="rounded-[4px] px-2.5 py-2 self-end"
                  data-v3-live="aiSidebar.messageUserBg"
                  style={{
                    maxWidth: "92%",
                    background: "var(--v3-ai-message-user-bg, #313131)",
                  }}
                >
                  <p
                    className="whitespace-pre-wrap break-words"
                    style={{
                      fontSize: 11,
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.45,
                      color: "var(--v3-ai-header-text, #ffffff)",
                    }}
                  >
                    {msg.content}
                  </p>
                </div>
              ) : msg.role === "assistant" ? (
                <AssistantMessage
                  key={`${msg.role}-${i}`}
                  content={msg.content}
                  thinking={msg.thinking}
                  editProposalIds={msg.editProposalIds}
                />
              ) : null,
            )}
          </div>
        ) : null}

        {isLoading && (
          <div className="px-3 pb-3">
            <div
              className="rounded-[4px] px-2.5 py-2 self-start"
              data-v3-live="aiSidebar.messageAssistantBg"
              style={{
                maxWidth: "92%",
                background: "var(--v3-ai-message-assistant-bg, #1e1e1e)",
                border: "1px solid var(--v3-ai-message-border, rgba(255,255,255,0.06))",
              }}
            >
              {streamingThinking ? (
                <pre
                  className="whitespace-pre-wrap break-words max-h-[100px] overflow-y-auto mb-2"
                  style={{
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                    lineHeight: 1.4,
                    color: "var(--v3-ai-icon-muted, #8a8a89)",
                  }}
                >
                  {streamingThinking}
                </pre>
              ) : null}
              <p
                style={{
                  fontSize: 11,
                  fontFamily: "Inter, sans-serif",
                  color: "var(--v3-ai-icon-muted, #6f6f6e)",
                }}
              >
                {streamingToolLabel
                  ? streamingToolLabel
                  : agentRound > 0
                    ? `Working… (step ${agentRound + 1})`
                    : "Thinking…"}
              </p>
              {streamingContent ? (
                <p
                  className="whitespace-pre-wrap break-words mt-1"
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter, sans-serif",
                    lineHeight: 1.45,
                    color: "var(--v3-ai-header-text, #ffffff)",
                  }}
                >
                  {streamingContent}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {pendingEdits ? (
        <div
          className="shrink-0 mx-3 mb-2 rounded-[4px] px-2 py-1.5"
          data-v3-live="aiSidebar.warningBg"
          style={{ background: "var(--v3-ai-warning-bg, rgba(234, 179, 8, 0.12))" }}
        >
          <p
            data-v3-live="aiSidebar.warningText"
            style={{
              fontSize: 10,
              fontFamily: "Inter, sans-serif",
              color: "var(--v3-ai-warning-text, #eab308)",
            }}
          >
            Pending editor changes — review in the editor. You can keep chatting.
          </p>
        </div>
      ) : null}

      {error && (
        <div
          className="shrink-0 mx-3 mb-2 rounded-[4px] px-2 py-1.5"
          style={{
            background: "color-mix(in srgb, var(--v3-ai-error-text, #cf6363) 15%, transparent)",
          }}
        >
          <div className="flex items-start gap-1.5">
            <button
              type="button"
              className="shrink-0 mt-0.5 hover:opacity-80 transition-opacity flex items-center justify-center"
              data-v3-live="aiSidebar.errorText"
              style={{ width: 16, height: 16, color: "var(--v3-ai-error-text, #cf6363)" }}
              title={errorExpanded ? "Collapse error" : "Expand error"}
              aria-expanded={errorExpanded}
              onClick={() => setErrorExpanded((v) => !v)}
            >
              <svg
                viewBox="0 0 12 12"
                width={12}
                height={12}
                fill="none"
                style={{
                  transform: errorExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                }}
              >
                <path
                  d="M4 2L9 6L4 10"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={
                  errorExpanded
                    ? "whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto"
                    : "truncate"
                }
                style={{
                  fontSize: errorExpanded ? 12 : 10,
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.45,
                  color: "var(--v3-ai-error-text, #cf6363)",
                }}
              >
                {error}
              </p>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-3 pl-[22px]">
            <button
              type="button"
              className="hover:opacity-80 transition-opacity"
              style={{
                fontSize: 10,
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-ai-error-text, #cf6363)",
              }}
              onClick={() => void handleCopyError()}
            >
              {copyLabel}
            </button>
            <button
              type="button"
              className="hover:opacity-80 transition-opacity"
              style={{
                fontSize: 10,
                fontFamily: "Inter, sans-serif",
                color: "var(--v3-ai-error-text, #cf6363)",
              }}
              onClick={clearError}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div
        className="shrink-0 flex items-end gap-2 px-2 pb-2 pt-2 border-t border-solid"
        data-v3-live="aiSidebar.inputBg"
        style={{
          borderColor: "var(--v3-ai-panel-border, rgba(255,255,255,0.08))",
          background: "var(--v3-ai-input-bg, #212120)",
        }}
      >
        <button
          type="button"
          className="shrink-0 flex items-center justify-center rounded-[3px] hover:opacity-80 transition-opacity"
          style={{
            width: 28,
            height: 28,
            color: "var(--v3-ai-icon-muted, #868686)",
          }}
          title="Clear chat · Shift+click to delete all chats"
          onClick={handleClearClick}
        >
          <V3FluentIcon name="eraser20Filled" size={16} color="currentColor" />
        </button>
        <div
          className="flex min-w-0 flex-1 items-end gap-1.5 rounded-[4px] border border-solid px-2 py-1.5"
          style={{
            background: "var(--v3-settings-field-bg, #373737)",
            borderColor: "var(--v3-settings-field-border, #3d3d3c)",
          }}
        >
          <svg viewBox="0 0 16 16" width={14} height={14} fill="none" className="shrink-0 mb-0.5">
            <path
              d="M4 4.5a3.5 3.5 0 0 1 6.8 1.2l.2.8H13a1 1 0 0 1 1 1v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-7A1 1 0 0 1 3 4.5h1z"
              stroke="var(--v3-ai-icon-muted, #868686)"
              strokeWidth={1.1}
              strokeLinejoin="round"
            />
          </svg>
          <textarea
            ref={textareaRef}
            value={draft}
            rows={1}
            placeholder="Send message."
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent outline-none min-w-0"
            data-v3-live="aiSidebar.inputText"
            style={{
              fontSize: 11,
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.45,
              color: "var(--v3-ai-input-text, #ffffff)",
              minHeight: 20,
              maxHeight: 72,
            }}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          type="button"
          disabled={isLoading || !draft.trim()}
          className="shrink-0 rounded-[3px] flex items-center justify-center transition-opacity disabled:opacity-40 hover:opacity-80"
          data-v3-live="aiSidebar.messageUserBg"
          style={{
            width: 28,
            height: 28,
            background: "var(--v3-settings-control-bg, #373737)",
            border: "1px solid var(--v3-settings-control-border, #3d3d3c)",
          }}
          title="Send"
          onClick={handleSend}
        >
          <svg viewBox="0 0 16 16" width={14} height={14} fill="none">
            <path
              d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 6L7 9"
              stroke="var(--v3-ai-header-text, white)"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <style>{`
        .v3-ai-chat-scroll::-webkit-scrollbar { width: 4px; }
        .v3-ai-chat-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
        .v3-ai-chat-scroll textarea::placeholder { color: var(--v3-ai-input-placeholder, #6f6f6e); }
      `}</style>
    </div>
  );
}

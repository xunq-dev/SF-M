import { useCallback, useEffect, useRef, useState } from "react";
import { isAiChatError, sendAiChat, type AiChatMessage } from "./v3AiProviders";
import { readV3AiSettings, getV3AiApiKey } from "./v3AiSettings";
import { useEditorAiProposals } from "./EditorAiProposalContext";
import { logAiDebug } from "./v3AiDebugLog";
import {
  deleteChatSession,
  getActiveSession,
  loadTabChatState,
  saveTabChatState,
  selectChatSession,
  sessionTitleFromMessage,
  startNewChatSession,
  upsertActiveSession,
  clearAllChatSessions,
  type AiChatSession,
  type TabChatState,
} from "./v3AiChatStorage";

export type UseV3AiChatOptions = {
  tabId: string;
  tabTitle: string;
  scriptContent: string;
  diskPath?: string;
};

function buildAssistantFallbackContent(
  editCount: number,
  hadStream: boolean,
): string {
  if (editCount > 0) {
    return `Proposed ${editCount} edit${editCount === 1 ? "" : "s"} in the editor — review when ready.`;
  }
  if (hadStream) return "Done.";
  return "No response text from the model.";
}

export function useV3AiChat({ tabId, tabTitle, scriptContent, diskPath }: UseV3AiChatOptions) {
  const { addProposal } = useEditorAiProposals();
  const [tabState, setTabState] = useState<TabChatState>(() => loadTabChatState(tabId));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingThinking, setStreamingThinking] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingToolLabel, setStreamingToolLabel] = useState("");
  const [agentRound, setAgentRound] = useState(0);
  const streamContentRef = useRef("");
  const streamThinkingRef = useRef("");
  const prevTabIdRef = useRef(tabId);

  const activeSession = getActiveSession(tabState);
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    if (prevTabIdRef.current === tabId) return;
    setTabState((current) => {
      saveTabChatState(prevTabIdRef.current, current);
      return loadTabChatState(tabId);
    });
    setError(null);
    setStreamingThinking("");
    setStreamingContent("");
    setStreamingToolLabel("");
    setAgentRound(0);
    prevTabIdRef.current = tabId;
  }, [tabId]);

  useEffect(() => {
    saveTabChatState(tabId, tabState);
  }, [tabId, tabState]);

  const updateActiveMessages = useCallback(
    (updater: (msgs: AiChatMessage[]) => AiChatMessage[]) => {
      setTabState((prev) =>
        upsertActiveSession(prev, (session) => {
          const nextMessages = updater(session.messages);
          return {
            ...session,
            messages: nextMessages,
            title:
              session.title === "New chat" && nextMessages[0]?.role === "user"
                ? sessionTitleFromMessage(nextMessages[0].content)
                : session.title,
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const settings = readV3AiSettings();
      if (!getV3AiApiKey(settings.provider)) {
        setError("Add an API key in Settings to start chatting.");
        return;
      }

      const userMessage: AiChatMessage = { role: "user", content: trimmed };
      updateActiveMessages((prev) => [...prev, userMessage]);
      setError(null);
      setIsLoading(true);
      setStreamingThinking("");
      setStreamingContent("");
      setStreamingToolLabel("");
      setAgentRound(0);
      streamContentRef.current = "";
      streamThinkingRef.current = "";

      logAiDebug("ui_send", {
        tabId,
        tabTitle,
        textLength: trimmed.length,
        priorMessages: messages.length,
        scriptChars: scriptContent.length,
      });

      try {
        const result = await sendAiChat(
          {
            ...settings,
            tabId,
            messages: [...messages, userMessage],
            scriptContext: { tabTitle, diskPath, content: scriptContent },
            addProposal,
          },
          {
            onThinkingDelta: (delta) => {
              streamThinkingRef.current += delta;
              setStreamingThinking((prev) => prev + delta);
            },
            onContentDelta: (delta) => {
              streamContentRef.current += delta;
              setStreamingContent((prev) => prev + delta);
            },
            onToolCall: (call) => setStreamingToolLabel(`Tool: ${call.name}`),
            onRoundStart: (round) => {
              setAgentRound(round);
              if (round > 0) setStreamingToolLabel("");
            },
          },
        );

        const streamedContent = streamContentRef.current.trim();
        const streamedThinking = streamThinkingRef.current.trim();
        const editCount = isAiChatError(result) ? 0 : (result.editProposalIds?.length ?? 0);

        let assistantContent = "";
        let assistantThinking: string | undefined;
        let editProposalIds: string[] | undefined;

        if (isAiChatError(result)) {
          logAiDebug("ui_send_error", { error: result.error });
          setError(result.error);
          assistantContent =
            streamedContent || buildAssistantFallbackContent(editCount, Boolean(streamedContent));
        } else {
          assistantContent =
            result.content.trim() ||
            streamedContent ||
            buildAssistantFallbackContent(editCount, Boolean(streamedContent));
          assistantThinking = result.thinking || streamedThinking || undefined;
          editProposalIds = result.editProposalIds;
          logAiDebug("ui_send_ok", {
            contentLength: assistantContent.length,
            thinkingLength: assistantThinking?.length ?? 0,
            proposalCount: editCount,
          });
        }

        updateActiveMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantContent,
            thinking: assistantThinking,
            editProposalIds,
          },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send message.";
        logAiDebug("ui_send_throw", { error: message });
        const streamedContent = streamContentRef.current.trim();
        updateActiveMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              streamedContent ||
              buildAssistantFallbackContent(0, Boolean(streamedContent)),
            thinking: streamThinkingRef.current.trim() || undefined,
          },
        ]);
        setError(message);
      } finally {
        setIsLoading(false);
        setStreamingThinking("");
        setStreamingContent("");
        setStreamingToolLabel("");
        setAgentRound(0);
      }
    },
    [
      isLoading,
      messages,
      tabId,
      tabTitle,
      scriptContent,
      diskPath,
      addProposal,
      updateActiveMessages,
    ],
  );

  const newChat = useCallback(() => {
    setTabState((prev) => startNewChatSession(tabId, prev));
    setError(null);
    setStreamingThinking("");
    setStreamingContent("");
    setStreamingToolLabel("");
  }, [tabId]);

  const selectSession = useCallback((sessionId: string) => {
    setTabState((prev) => selectChatSession(prev, sessionId));
    setError(null);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setTabState((prev) => deleteChatSession(prev, sessionId));
  }, []);

  const clearAllChats = useCallback(() => {
    setTabState(clearAllChatSessions(tabId));
    setError(null);
    setStreamingThinking("");
    setStreamingContent("");
    setStreamingToolLabel("");
  }, [tabId]);

  const clearError = useCallback(() => setError(null), []);

  const sessions: AiChatSession[] = tabState.sessions;

  return {
    messages,
    sessions,
    activeSessionId: tabState.activeSessionId,
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
  };
}

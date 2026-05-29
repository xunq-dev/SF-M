import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauriApp } from "@/app/tauriEnv";
import type { V3AiProvider, V3AiSettings } from "./v3AiSettings";
import { getEffectiveAiModel, getV3AiApiKey } from "./v3AiSettings";
import { buildAiRequestContext, buildCombinedSystemPrompt, parseThinkingFromContent, SYNAPSE_AI_SYSTEM_PROMPT } from "./v3AiSystemPrompt";
import { AI_EDIT_TOOLS, executeAiToolCall, type AiToolCall } from "./v3AiTools";
import type { AiEditProposal } from "./EditorAiProposalContext";
import { logAiDebug } from "./v3AiDebugLog";
import { trimMessagesForApi } from "./v3AiMessageLimits";

export type AiChatMessage = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  thinking?: string;
  editProposalIds?: string[];
  tool_call_id?: string;
  tool_calls?: AiProviderToolCall[];
};

export type AiProviderToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type AiChatResult = {
  content: string;
  thinking?: string;
  editProposalIds?: string[];
} | { error: string };

export function isAiChatError(result: AiChatResult): result is { error: string } {
  return "error" in result && typeof result.error === "string" && result.error.length > 0;
}

export type AiChatRequest = V3AiSettings & {
  messages: AiChatMessage[];
  scriptContext?: {
    tabTitle: string;
    diskPath?: string;
    content: string;
  };
  tabId: string;
  addProposal: (proposal: Omit<AiEditProposal, "id">) => string;
};

export type AiStreamCallbacks = {
  onThinkingDelta?: (delta: string) => void;
  onContentDelta?: (delta: string) => void;
  onToolCall?: (call: AiToolCall) => void;
  onRoundStart?: (round: number) => void;
};

type RustChatResult = {
  content?: string;
  error?: string | null;
  thinking?: string;
  tool_calls?: AiToolCall[];
};

function normalizeRustChatResult(result: RustChatResult): RustChatResult {
  if (result.error) return { error: result.error };
  return {
    content: result.content,
    thinking: result.thinking,
    tool_calls: result.tool_calls,
  };
}

type RustStreamEvent = {
  kind: string;
  delta?: string;
  tool_call?: AiToolCall;
  message?: string;
};

const MAX_TOOL_ROUNDS = 8;

function friendlyTransportError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("decoding response body")) {
    return "Connection interrupted or the provider response was too large. Try a new chat or a shorter request.";
  }
  if (lower.includes("request failed") || lower.includes("timed out")) {
    return `Network error while talking to the AI provider: ${message}`;
  }
  return message;
}

function dedupeToolCalls(calls: AiToolCall[]): AiToolCall[] {
  const seen = new Set<string>();
  const out: AiToolCall[] = [];
  for (const call of calls) {
    if (!call.id || seen.has(call.id)) continue;
    seen.add(call.id);
    out.push(call);
  }
  return out;
}

function toProviderMessages(messages: AiChatMessage[]): AiChatMessage[] {
  return messages.filter((m) => m.role !== "system");
}

function toApiMessages(messages: AiChatMessage[]) {
  return toProviderMessages(messages).map((m) => ({
    role: m.role,
    content: m.content,
    reasoning_content: m.thinking?.trim() || undefined,
    tool_call_id: m.tool_call_id,
    tool_calls: m.tool_calls,
  }));
}

function buildScriptContextInput(request: AiChatRequest): string | undefined {
  if (!request.scriptContext) return undefined;
  return buildAiRequestContext(request.scriptContext);
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as {
      error?: { message?: string };
      message?: string;
    };
    return data.error?.message ?? data.message ?? res.statusText;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

async function sendOpenAiCompatibleBlocking(
  url: string,
  apiKey: string,
  model: string,
  system: string,
  messages: AiChatMessage[],
  tools?: typeof AI_EDIT_TOOLS,
): Promise<RustChatResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...toApiMessages(messages).map((m) => {
          const msg: Record<string, unknown> = { role: m.role, content: m.content };
          if (m.reasoning_content) msg.reasoning_content = m.reasoning_content;
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
          if (m.tool_calls) msg.tool_calls = m.tool_calls;
          return msg;
        }),
      ],
      ...(tools ? { tools, tool_choice: "auto" as const } : {}),
    }),
  });
  if (!res.ok) return { error: await readErrorBody(res) };
  const data = (await res.json()) as {
    choices?: {
      message?: {
        content?: string;
        reasoning_content?: string;
        tool_calls?: AiProviderToolCall[];
      };
    }[];
  };
  const message = data.choices?.[0]?.message;
  const tool_calls = message?.tool_calls?.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));
  return {
    content: message?.content?.trim(),
    thinking: message?.reasoning_content?.trim(),
    tool_calls,
  };
}

async function invokeChatStream(
  requestId: string,
  payload: Record<string, unknown>,
  callbacks: AiStreamCallbacks,
): Promise<RustChatResult> {
  const toolCalls: AiToolCall[] = [];
  let unlisten: UnlistenFn | null = null;
  try {
    unlisten = await listen<RustStreamEvent>(`ai-chat-stream-${requestId}`, (event) => {
      const ev = event.payload;
      if (ev.kind === "thinking" && ev.delta) callbacks.onThinkingDelta?.(ev.delta);
      if (ev.kind === "content" && ev.delta) callbacks.onContentDelta?.(ev.delta);
      if (ev.kind === "tool_call" && ev.tool_call) {
        toolCalls.push(ev.tool_call);
        callbacks.onToolCall?.(ev.tool_call);
        logAiDebug("stream_tool_call", {
          requestId,
          tool: ev.tool_call.name,
          id: ev.tool_call.id,
          argsLength: ev.tool_call.arguments.length,
        });
      }
      if (ev.kind === "error" && ev.message) {
        logAiDebug("stream_error_event", { requestId, message: ev.message });
      }
    });
    logAiDebug("invoke_stream_start", {
      requestId,
      provider: payload.provider,
      model: payload.model,
      messageCount: Array.isArray(payload.messages) ? payload.messages.length : 0,
      includeTools: payload.tools != null,
    });
    const result = await invoke<RustChatResult>("send_ai_chat_stream", {
      requestId,
      ...payload,
    });
    const normalized = normalizeRustChatResult(result);
    const mergedToolCalls = dedupeToolCalls([
      ...toolCalls,
      ...(normalized.tool_calls ?? []),
    ]);
    logAiDebug("invoke_stream_done", {
      requestId,
      error: normalized.error,
      contentLength: normalized.content?.length ?? 0,
      thinkingLength: normalized.thinking?.length ?? 0,
      toolCallCount: mergedToolCalls.length,
    });
    return {
      ...normalized,
      error: normalized.error ? friendlyTransportError(normalized.error) : undefined,
      tool_calls: mergedToolCalls.length ? mergedToolCalls : undefined,
    };
  } finally {
    await unlisten?.();
  }
}

async function invokeChatBlocking(payload: Record<string, unknown>): Promise<RustChatResult> {
  const { requestId: _requestId, ...rest } = payload;
  logAiDebug("invoke_blocking_start", {
    provider: rest.provider,
    model: rest.model,
    messageCount: Array.isArray(rest.messages) ? rest.messages.length : 0,
    includeTools: rest.tools != null,
  });
  const result = await invoke<RustChatResult>("send_ai_chat", rest);
  const normalized = normalizeRustChatResult(result);
  logAiDebug("invoke_blocking_done", {
    error: normalized.error,
    contentLength: normalized.content?.length ?? 0,
    thinkingLength: normalized.thinking?.length ?? 0,
    toolCallCount: normalized.tool_calls?.length ?? 0,
  });
  return {
    ...normalized,
    error: normalized.error ? friendlyTransportError(normalized.error) : undefined,
  };
}

async function invokeChatWithFallback(
  requestId: string,
  payload: Record<string, unknown>,
  callbacks: AiStreamCallbacks,
): Promise<RustChatResult> {
  try {
    return await invokeChatStream(requestId, payload, callbacks);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logAiDebug("invoke_stream_failed", { requestId, error: errMsg });
    try {
      return await invokeChatBlocking(payload);
    } catch (blockingErr) {
      const blockingMsg =
        blockingErr instanceof Error ? blockingErr.message : String(blockingErr);
      logAiDebug("invoke_blocking_failed", { error: blockingMsg });
      return { error: friendlyTransportError(errMsg || blockingMsg) };
    }
  }
}

async function runSingleChatRound(
  request: AiChatRequest,
  messages: AiChatMessage[],
  callbacks: AiStreamCallbacks,
  options?: { includeTools?: boolean },
): Promise<RustChatResult> {
  const includeTools = options?.includeTools ?? true;
  const apiKey = getV3AiApiKey(request.provider)!;
  const model = getEffectiveAiModel(request);
  const scriptContext = buildScriptContextInput(request);
  const system = buildCombinedSystemPrompt(scriptContext);
  const providerMessages = toApiMessages(trimMessagesForApi(messages));

  const payload = {
    provider: request.provider,
    apiKey,
    model,
    system: SYNAPSE_AI_SYSTEM_PROMPT,
    scriptContext: scriptContext ?? null,
    messages: providerMessages,
    tools: includeTools ? AI_EDIT_TOOLS : null,
  };

  if (isTauriApp()) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return invokeChatWithFallback(requestId, payload, callbacks);
  }

  switch (request.provider) {
    case "openai":
      return sendOpenAiCompatibleBlocking(
        "https://api.openai.com/v1/chat/completions",
        apiKey,
        model,
        system,
        messages,
        AI_EDIT_TOOLS,
      );
    case "opencode": {
      const url = model.startsWith("claude-")
        ? "https://opencode.ai/zen/v1/messages"
        : "https://opencode.ai/zen/v1/chat/completions";
      return sendOpenAiCompatibleBlocking(url, apiKey, model, system, messages, AI_EDIT_TOOLS);
    }
    default:
      return { error: "Streaming chat requires the desktop app for this provider." };
  }
}

function absorbAssistantText(
  result: RustChatResult,
  textParts: string[],
  thinkingParts: string[],
) {
  const rawContent = result.content?.trim() ?? "";
  if (rawContent) {
    const parsed = parseThinkingFromContent(rawContent);
    if (parsed.content) textParts.push(parsed.content);
    if (parsed.thinking) thinkingParts.push(parsed.thinking);
  }
  const rawThinking = result.thinking?.trim() ?? "";
  if (rawThinking) thinkingParts.push(rawThinking);
}

function mergeTextParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

function toolCallsToAssistantMessage(
  toolCalls: AiToolCall[],
  thinking?: string,
): AiChatMessage {
  return {
    role: "assistant",
    content: "",
    thinking: thinking?.trim() || undefined,
    tool_calls: toolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.name, arguments: tc.arguments },
    })),
  };
}

export async function sendAiChat(
  request: AiChatRequest,
  callbacks: AiStreamCallbacks = {},
): Promise<AiChatResult> {
  const apiKey = getV3AiApiKey(request.provider);
  if (!apiKey) {
    return { error: "Add an API key in Settings to start chatting." };
  }
  if (!request.messages.length) {
    return { error: "No messages to send." };
  }

  let streamedContent = "";
  let streamedThinking = "";
  const wrappedCallbacks: AiStreamCallbacks = {
    onThinkingDelta: (delta) => {
      streamedThinking += delta;
      callbacks.onThinkingDelta?.(delta);
    },
    onContentDelta: (delta) => {
      streamedContent += delta;
      callbacks.onContentDelta?.(delta);
    },
    onToolCall: callbacks.onToolCall,
    onRoundStart: (round) => {
      streamedContent = "";
      streamedThinking = "";
      callbacks.onRoundStart?.(round);
    },
  };

  let conversation = [...request.messages];
  const allProposalIds: string[] = [];
  const toolRoundTexts: string[] = [];
  const toolRoundThinking: string[] = [];
  let finalContent = "";
  let finalThinking = "";
  let hadToolActivity = false;

  logAiDebug("send_start", {
    provider: request.provider,
    model: getEffectiveAiModel(request),
    tabId: request.tabId,
    userMessageCount: request.messages.filter((m) => m.role === "user").length,
    scriptChars: request.scriptContext?.content.length ?? 0,
  });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    wrappedCallbacks.onRoundStart?.(round);
    logAiDebug("round_start", {
      round,
      conversationMessages: conversation.length,
    });

    const result = await runSingleChatRound(request, conversation, wrappedCallbacks);

    if (result.error) {
      logAiDebug("round_error", { round, error: result.error, hadToolActivity });
      if (hadToolActivity) break;
      return { error: result.error };
    }

    if (result.tool_calls?.length) {
      hadToolActivity = true;
      absorbAssistantText(result, toolRoundTexts, toolRoundThinking);
      if (streamedContent.trim()) toolRoundTexts.push(streamedContent.trim());
      if (streamedThinking.trim()) toolRoundThinking.push(streamedThinking.trim());
      streamedContent = "";
      streamedThinking = "";

      const toolCalls = dedupeToolCalls(result.tool_calls);
      logAiDebug("round_tool_calls", {
        round,
        tools: toolCalls.map((tc) => ({ name: tc.name, id: tc.id, argsLength: tc.arguments.length })),
      });
      conversation.push(toolCallsToAssistantMessage(toolCalls, result.thinking));
      for (const call of toolCalls) {
        const toolResult = executeAiToolCall(
          call,
          request.tabId,
          request.scriptContext?.content ?? "",
          request.addProposal,
        );
        logAiDebug("tool_executed", {
          round,
          tool: call.name,
          id: call.id,
          resultLength: toolResult.length,
          resultPreview: toolResult.slice(0, 240),
        });
        try {
          const parsed = JSON.parse(toolResult) as { proposalId?: string };
          if (parsed.proposalId) allProposalIds.push(parsed.proposalId);
        } catch {
          /* ignore */
        }
        conversation.push({
          role: "tool",
          content: toolResult,
          tool_call_id: call.id,
        });
      }
      continue;
    }

    const rawContent = result.content?.trim() ?? streamedContent.trim();
    const parsed = parseThinkingFromContent(rawContent);
    finalThinking = result.thinking?.trim() || parsed.thinking || streamedThinking.trim();
    finalContent = parsed.content || rawContent;
    if (streamedContent.trim() && !finalContent.includes(streamedContent.trim())) {
      finalContent = finalContent ? `${finalContent}\n\n${streamedContent.trim()}` : streamedContent.trim();
    }
    logAiDebug("round_final_text", {
      round,
      contentLength: finalContent.length,
      thinkingLength: finalThinking.length,
    });
    break;
  }

  if (!finalContent && hadToolActivity) {
    logAiDebug("summary_round_start", { conversationMessages: conversation.length });
    const summary = await runSingleChatRound(request, conversation, wrappedCallbacks, {
      includeTools: false,
    });
    if (!summary.error) {
      const rawContent = summary.content?.trim() ?? streamedContent.trim();
      const parsed = parseThinkingFromContent(rawContent);
      finalThinking =
        summary.thinking?.trim() || parsed.thinking || streamedThinking.trim() || finalThinking;
      finalContent = parsed.content || rawContent;
      if (streamedContent.trim() && !finalContent.includes(streamedContent.trim())) {
        finalContent = finalContent
          ? `${finalContent}\n\n${streamedContent.trim()}`
          : streamedContent.trim();
      }
      logAiDebug("summary_round_done", { contentLength: finalContent.length });
    } else {
      logAiDebug("summary_round_error", { error: summary.error });
    }
  }

  if (!finalContent) {
    finalContent = mergeTextParts(toolRoundTexts);
  }
  if (!finalThinking) {
    finalThinking = mergeTextParts(toolRoundThinking);
  }
  if (!finalContent && streamedContent.trim()) {
    finalContent = streamedContent.trim();
  }
  if (!finalThinking && streamedThinking.trim()) {
    finalThinking = streamedThinking.trim();
  }

  if (!finalContent && allProposalIds.length === 0 && !hadToolActivity) {
    logAiDebug("send_empty", {});
    return { error: "Empty response from provider." };
  }

  const response = {
    content:
      finalContent ||
      (allProposalIds.length
        ? "Proposed edits are in the editor — review and accept or decline when ready. You can keep chatting."
        : hadToolActivity
          ? "Finished tool steps but the model did not return a final message. You can send a follow-up."
          : "Empty response from provider."),
    thinking: finalThinking || undefined,
    editProposalIds: allProposalIds.length ? allProposalIds : undefined,
  };

  logAiDebug("send_complete", {
    contentLength: response.content.length,
    proposalCount: allProposalIds.length,
    hadToolActivity,
  });

  return response;
}

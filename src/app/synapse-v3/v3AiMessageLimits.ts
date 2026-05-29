import type { AiChatMessage } from "./v3AiProviders";

export const MAX_TOOL_MESSAGE_CHARS = 6000;
export const MAX_CONVERSATION_MESSAGES = 48;

export function truncateText(text: string, max: number, label = "chars"): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...[truncated ${text.length - max} ${label}]`;
}

export function trimMessagesForApi(messages: AiChatMessage[]): AiChatMessage[] {
  const trimmed = messages.map((message) => {
    if (message.role !== "tool") return message;
    if (message.content.length <= MAX_TOOL_MESSAGE_CHARS) return message;
    return {
      ...message,
      content: truncateText(message.content, MAX_TOOL_MESSAGE_CHARS),
    };
  });

  if (trimmed.length <= MAX_CONVERSATION_MESSAGES) return trimmed;

  const firstUserIdx = trimmed.findIndex((m) => m.role === "user");
  const head = firstUserIdx >= 0 ? [trimmed[firstUserIdx]] : [];
  const tailCount = MAX_CONVERSATION_MESSAGES - head.length;
  const tail = trimmed.slice(-Math.max(tailCount, 1));
  const merged =
    head.length && tail[0]?.role === "user" && head[0] === tail[0] ? tail : [...head, ...tail];

  return merged;
}

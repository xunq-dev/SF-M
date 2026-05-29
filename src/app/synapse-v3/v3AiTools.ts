import type { AiEditProposal, AiEditRange } from "./EditorAiProposalContext";

export type AiToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const AI_EDIT_TOOLS: AiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "read_script",
      description:
        "Read a preview of the active script. Full script is already in context — only use after the user may have edited the file.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_edit",
      description:
        "Propose a line/column edit on the active script. Does not apply until the user accepts.",
      parameters: {
        type: "object",
        properties: {
          startLine: { type: "number", description: "1-based start line" },
          startColumn: { type: "number", description: "1-based start column" },
          endLine: { type: "number", description: "1-based end line" },
          endColumn: { type: "number", description: "1-based end column" },
          newText: { type: "string", description: "Replacement text" },
        },
        required: ["startLine", "startColumn", "endLine", "endColumn", "newText"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_replace",
      description: "Find text in the active script and propose replacing it.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Exact text to find" },
          replace: { type: "string", description: "Replacement text" },
        },
        required: ["search", "replace"],
        additionalProperties: false,
      },
    },
  },
];

export type AiToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export function findTextRange(
  content: string,
  search: string,
): { range: AiEditRange; originalText: string } | null {
  const idx = content.indexOf(search);
  if (idx < 0) return null;
  const before = content.slice(0, idx);
  const startLine = before.split("\n").length;
  const startColumn = (before.split("\n").pop()?.length ?? 0) + 1;
  const endOffset = idx + search.length;
  const beforeEnd = content.slice(0, endOffset);
  const endLine = beforeEnd.split("\n").length;
  const endColumn = (beforeEnd.split("\n").pop()?.length ?? 0) + 1;
  return {
    range: { startLineNumber: startLine, startColumn, endLineNumber: endLine, endColumn },
    originalText: search,
  };
}

export function lineRangeToText(content: string, range: AiEditRange): string {
  const lines = content.split("\n");
  const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
  if (startLineNumber === endLineNumber) {
    const line = lines[startLineNumber - 1] ?? "";
    return line.slice(startColumn - 1, endColumn - 1);
  }
  const parts: string[] = [];
  for (let ln = startLineNumber; ln <= endLineNumber; ln++) {
    const line = lines[ln - 1] ?? "";
    if (ln === startLineNumber) parts.push(line.slice(startColumn - 1));
    else if (ln === endLineNumber) parts.push(line.slice(0, endColumn - 1));
    else parts.push(line);
  }
  return parts.join("\n");
}

export function executeAiToolCall(
  call: AiToolCall,
  tabId: string,
  scriptContent: string,
  addProposal: (proposal: Omit<AiEditProposal, "id">) => string,
): string {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
  } catch {
    return JSON.stringify({ error: "Invalid tool arguments JSON." });
  }

  switch (call.name) {
    case "read_script": {
      const lineCount = scriptContent.split("\n").length;
      const preview = scriptContent.slice(0, 1200);
      return JSON.stringify({
        note: "Script is already in your system context. This is a short preview only.",
        lineCount,
        charCount: scriptContent.length,
        preview: preview + (scriptContent.length > preview.length ? "\n...[preview truncated]" : ""),
      });
    }
    case "propose_edit": {
      const range: AiEditRange = {
        startLineNumber: Number(args.startLine),
        startColumn: Number(args.startColumn),
        endLineNumber: Number(args.endLine),
        endColumn: Number(args.endColumn),
      };
      const newText = String(args.newText ?? "");
      if (!range.startLineNumber || !range.endLineNumber) {
        return JSON.stringify({ error: "Invalid line range." });
      }
      const originalText = lineRangeToText(scriptContent, range);
      const id = addProposal({ tabId, range, originalText, proposedText: newText });
      return JSON.stringify({ ok: true, proposalId: id, originalText, newText });
    }
    case "propose_replace": {
      const search = String(args.search ?? "");
      const replace = String(args.replace ?? "");
      if (!search) return JSON.stringify({ error: "search is required." });
      const found = findTextRange(scriptContent, search);
      if (!found) return JSON.stringify({ error: "Text not found in script." });
      const id = addProposal({
        tabId,
        range: found.range,
        originalText: found.originalText,
        proposedText: replace,
      });
      return JSON.stringify({ ok: true, proposalId: id });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${call.name}` });
  }
}

export function applyProposalsToContent(
  content: string,
  proposals: AiEditProposal[],
): string {
  const sorted = [...proposals].sort((a, b) => {
    if (b.range.startLineNumber !== a.range.startLineNumber) {
      return b.range.startLineNumber - a.range.startLineNumber;
    }
    return b.range.startColumn - a.range.startColumn;
  });
  let result = content;
  for (const p of sorted) {
    const lines = result.split("\n");
    const { startLineNumber, startColumn, endLineNumber, endColumn } = p.range;
    if (startLineNumber === endLineNumber) {
      const line = lines[startLineNumber - 1] ?? "";
      lines[startLineNumber - 1] =
        line.slice(0, startColumn - 1) + p.proposedText + line.slice(endColumn - 1);
    } else {
      const first = lines[startLineNumber - 1] ?? "";
      const last = lines[endLineNumber - 1] ?? "";
      const merged =
        first.slice(0, startColumn - 1) + p.proposedText + last.slice(endColumn - 1);
      lines.splice(startLineNumber - 1, endLineNumber - startLineNumber + 1, merged);
    }
    result = lines.join("\n");
  }
  return result;
}

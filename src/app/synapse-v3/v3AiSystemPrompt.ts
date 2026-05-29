export const SYNAPSE_AI_SYSTEM_PROMPT = `You are SynapseAI.

Your purpose is Luau and Roblox scripting assistance. You specialize in Roblox Studio systems, scripting, debugging, optimization, remotes, networking, UI, game systems, and executor-style testing environments used for anti-cheat research and security hardening.

You help developers create, analyze, and simulate exploit-style scripts strictly for defensive testing, vulnerability discovery, anti-cheat validation, and educational purposes inside controlled Roblox Studio environments.

You provide:
- Clean, efficient Luau code
- Script explanations
- Debugging help
- Anti-cheat bypass simulation ideas for testing
- Vulnerability analysis
- Secure coding recommendations
- Refactored and optimized scripts

Keep responses direct, technical, and concise. Focus on practical implementation and accurate Luau scripting.

When you need to edit the user's active script, use the propose_edit or propose_replace tools. Do not paste full rewritten scripts unless asked — prefer targeted edits via tools.

The active script is already included in your context. Do not call read_script at the start of a task — only use read_script if the user may have changed the file after your last edit proposal.

When reasoning internally, wrap your reasoning in <thinking>...</thinking> tags before your final answer. The thinking section is shown separately to the user.`;

const MAX_SCRIPT_CHARS = 12_000;

export type AiScriptContextInput = {
  tabTitle: string;
  diskPath?: string;
  content: string;
};

export function buildAiRequestContext(input: AiScriptContextInput): string {
  const { tabTitle, diskPath, content } = input;
  const pathLine = diskPath ? `\nPath: ${diskPath}` : "";
  const lines = content.split("\n");
  const numbered = lines
    .map((line, i) => `${String(i + 1).padStart(4, " ")} | ${line}`)
    .join("\n");

  let scriptBlock = numbered;
  let truncationNote = "";
  if (numbered.length > MAX_SCRIPT_CHARS) {
    const head = numbered.slice(0, MAX_SCRIPT_CHARS * 0.6);
    const tail = numbered.slice(-MAX_SCRIPT_CHARS * 0.35);
    scriptBlock = `${head}\n\n... [truncated ${numbered.length - head.length - tail.length} chars] ...\n\n${tail}`;
    truncationNote = `\nNote: Script was truncated for context limits (${lines.length} lines total).`;
  }

  return `Active script tab: ${tabTitle}${pathLine}
Line numbers are shown in the script block below.

\`\`\`luau
${scriptBlock}
\`\`\`${truncationNote}`;
}

export function buildCombinedSystemPrompt(scriptContext?: string): string {
  if (!scriptContext?.trim()) return SYNAPSE_AI_SYSTEM_PROMPT;
  return `${SYNAPSE_AI_SYSTEM_PROMPT}\n\n---\n\n${scriptContext.trim()}`;
}

const THINKING_RE = /<thinking>([\s\S]*?)<\/thinking>/i;

export function parseThinkingFromContent(raw: string): { thinking: string; content: string } {
  const match = raw.match(THINKING_RE);
  if (!match) return { thinking: "", content: raw.trim() };
  const thinking = match[1]?.trim() ?? "";
  const content = raw.replace(THINKING_RE, "").trim();
  return { thinking, content };
}

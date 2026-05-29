import type * as monaco from "monaco-editor";
import type { AiEditProposal } from "@/app/synapse-v3/EditorAiProposalContext";

type ViewZoneIds = {
  zoneIds: string[];
};

/** Fixed visible height for inline diff blocks; content scrolls inside. */
const DIFF_ZONE_HEIGHT_LINES = 8;

export function clearAiProposalUi(editor: monaco.editor.ICodeEditor): void {
  const ed = editor as monaco.editor.ICodeEditor & {
    _synapseAiProposalDecorations?: string[];
    _synapseAiViewZones?: ViewZoneIds;
  };
  if (ed._synapseAiProposalDecorations?.length) {
    ed._synapseAiProposalDecorations = editor.deltaDecorations(
      ed._synapseAiProposalDecorations,
      [],
    );
  }
  if (ed._synapseAiViewZones?.zoneIds.length) {
    editor.changeViewZones((accessor) => {
      for (const id of ed._synapseAiViewZones!.zoneIds) {
        accessor.removeZone(id);
      }
    });
    ed._synapseAiViewZones = { zoneIds: [] };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDiffZoneDom(
  original: string,
  proposed: string,
  maxWidth: number,
): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "synapse-ai-diff-zone";
  root.style.maxWidth = `${Math.max(160, maxWidth)}px`;
  root.innerHTML = `
    <div class="synapse-ai-diff-scroll">
      <div class="synapse-ai-diff-row synapse-ai-diff-removed">
        <span class="synapse-ai-diff-label">−</span>
        <pre class="synapse-ai-diff-text">${escapeHtml(original || "(empty)")}</pre>
      </div>
      <div class="synapse-ai-diff-row synapse-ai-diff-added">
        <span class="synapse-ai-diff-label">+</span>
        <pre class="synapse-ai-diff-text">${escapeHtml(proposed || "(empty)")}</pre>
      </div>
    </div>
  `;
  return root;
}

export function updateAiProposalUi(
  editor: monaco.editor.ICodeEditor,
  monacoApi: typeof monaco,
  proposals: AiEditProposal[],
  activeIndex: number,
): void {
  clearAiProposalUi(editor);

  if (!proposals.length) return;

  const ed = editor as monaco.editor.ICodeEditor & {
    _synapseAiProposalDecorations?: string[];
    _synapseAiViewZones?: ViewZoneIds;
  };

  const decorations: monaco.editor.IModelDeltaDecoration[] = proposals.map((p, idx) => ({
    range: new monacoApi.Range(
      p.range.startLineNumber,
      p.range.startColumn,
      p.range.endLineNumber,
      p.range.endColumn,
    ),
    options: {
      inlineClassName:
        idx === activeIndex
          ? "synapse-ai-proposal-highlight synapse-ai-proposal-highlight-active"
          : "synapse-ai-proposal-highlight",
      className: "synapse-ai-proposal-line-highlight",
      isWholeLine: p.range.startColumn === 1 && p.range.endColumn === 1,
    },
  }));

  ed._synapseAiProposalDecorations = editor.deltaDecorations([], decorations);

  const active = proposals[activeIndex] ?? proposals[0];
  if (!active) return;

  const contentWidth = editor.getLayoutInfo().contentWidth - 32;
  const zoneIds: string[] = [];
  editor.changeViewZones((accessor) => {
    const afterLine = Math.max(0, active.range.endLineNumber);
    const dom = buildDiffZoneDom(active.originalText, active.proposedText, contentWidth);
    const zoneId = accessor.addZone({
      afterLineNumber: afterLine,
      heightInLines: DIFF_ZONE_HEIGHT_LINES,
      domNode: dom,
      suppressMouseDown: false,
    });
    zoneIds.push(zoneId);
  });
  ed._synapseAiViewZones = { zoneIds };

  editor.revealRangeInCenter(
    new monacoApi.Range(
      active.range.startLineNumber,
      1,
      active.range.endLineNumber,
      1,
    ),
  );
}

export function revealProposal(
  editor: monaco.editor.ICodeEditor,
  monacoApi: typeof monaco,
  proposal: AiEditProposal,
): void {
  editor.revealRangeInCenter(
    new monacoApi.Range(
      proposal.range.startLineNumber,
      proposal.range.startColumn,
      proposal.range.endLineNumber,
      proposal.range.endColumn,
    ),
  );
  editor.setSelection(
    new monacoApi.Range(
      proposal.range.startLineNumber,
      proposal.range.startColumn,
      proposal.range.endLineNumber,
      proposal.range.endColumn,
    ),
  );
}

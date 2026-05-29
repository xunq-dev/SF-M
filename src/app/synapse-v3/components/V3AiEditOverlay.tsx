import { useEffect, useState } from "react";
import type { AiEditProposal } from "../EditorAiProposalContext";

type V3AiEditOverlayProps = {
  count: number;
  reviewIndex: number;
  proposal?: AiEditProposal;
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onReviewNext: () => void;
};

export function V3AiEditOverlay({
  count,
  reviewIndex,
  proposal,
  visible,
  onAccept,
  onDecline,
  onReviewNext,
}: V3AiEditOverlayProps) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 200);
    return () => window.clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === "Escape") onDecline();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onDecline]);

  if (!mounted) return null;

  return (
    <div
      className="absolute pointer-events-auto flex flex-col overflow-hidden rounded-[4px] border border-solid shadow-lg transition-all duration-200"
      data-v3-live="aiOverlay.panelBg"
      style={{
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 30,
        maxWidth: 420,
        marginLeft: "auto",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        background: "color-mix(in srgb, var(--v3-ai-overlay-panel-bg, #181818) 97%, transparent)",
        borderColor: "var(--v3-ai-overlay-panel-border, rgba(234, 179, 8, 0.35))",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2 border-b border-solid shrink-0"
        style={{ borderColor: "var(--v3-ai-overlay-diff-zone-border, rgba(255,255,255,0.06))" }}
      >
        <span
          data-v3-live="aiOverlay.headerText"
          style={{
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            color: "var(--v3-ai-overlay-header-text, #eab308)",
          }}
        >
          Review edit {reviewIndex + 1} of {count}
        </span>
        <button
          type="button"
          className="rounded-[3px] px-2 py-0.5 hover:opacity-90 transition-opacity"
          data-v3-live="aiOverlay.buttonBg"
          style={{
            fontSize: 10,
            fontFamily: "Inter, sans-serif",
            background: "var(--v3-ai-overlay-button-bg, rgba(255,255,255,0.06))",
            color: "var(--v3-ai-overlay-button-text, #d4d4d4)",
          }}
          onClick={onReviewNext}
        >
          Next
        </button>
      </div>

      {proposal ? (
        <div className="synapse-ai-overlay-diff-wrap px-3 py-2 min-h-0">
          <div className="synapse-ai-overlay-diff">
            <div className="synapse-ai-overlay-diff-row synapse-ai-overlay-diff-removed">
              <span className="synapse-ai-overlay-diff-label">−</span>
              <pre className="synapse-ai-overlay-diff-text">{proposal.originalText || "(empty)"}</pre>
            </div>
            <div className="synapse-ai-overlay-diff-row synapse-ai-overlay-diff-added">
              <span className="synapse-ai-overlay-diff-label">+</span>
              <pre className="synapse-ai-overlay-diff-text">{proposal.proposedText || "(empty)"}</pre>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="flex items-center justify-end gap-2 px-3 py-2 border-t border-solid shrink-0"
        style={{ borderColor: "var(--v3-ai-overlay-diff-zone-border, rgba(255,255,255,0.06))" }}
      >
        <button
          type="button"
          className="rounded-[3px] px-2.5 py-1 hover:opacity-90 transition-opacity"
          data-v3-live="aiOverlay.buttonBg"
          style={{
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            background: "var(--v3-ai-overlay-button-bg, rgba(255,255,255,0.06))",
            color: "var(--v3-ai-overlay-button-text, #d4d4d4)",
          }}
          onClick={onDecline}
        >
          Decline all
        </button>
        <button
          type="button"
          className="rounded-[3px] px-2.5 py-1 hover:opacity-90 transition-opacity"
          data-v3-live="aiOverlay.acceptBg"
          style={{
            fontSize: 11,
            fontFamily: "Inter, sans-serif",
            background: "var(--v3-ai-overlay-accept-bg, rgba(34, 197, 94, 0.22))",
            color: "var(--v3-ai-overlay-accept-text, #86efac)",
          }}
          onClick={onAccept}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}

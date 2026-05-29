import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyProposalsToContent } from "./v3AiTools";

export type AiEditRange = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};

export type AiEditProposal = {
  id: string;
  tabId: string;
  range: AiEditRange;
  originalText: string;
  proposedText: string;
};

type EditorAiProposalContextValue = {
  proposalsByTab: Record<string, AiEditProposal[]>;
  reviewIndexByTab: Record<string, number>;
  getProposalsForTab: (tabId: string) => AiEditProposal[];
  hasPendingProposals: (tabId: string) => boolean;
  addProposal: (proposal: Omit<AiEditProposal, "id">) => string;
  acceptAll: (tabId: string, content: string, onApply: (next: string) => void) => void;
  declineAll: (tabId: string) => void;
  setReviewIndex: (tabId: string, index: number) => void;
  cycleReview: (tabId: string) => void;
  getReviewIndex: (tabId: string) => number;
};

const EditorAiProposalContext = createContext<EditorAiProposalContextValue | null>(null);

function newProposalId(): string {
  return `edit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function EditorAiProposalProvider({ children }: { children: ReactNode }) {
  const [proposalsByTab, setProposalsByTab] = useState<Record<string, AiEditProposal[]>>({});
  const [reviewIndexByTab, setReviewIndexByTab] = useState<Record<string, number>>({});

  const getProposalsForTab = useCallback(
    (tabId: string) => proposalsByTab[tabId] ?? [],
    [proposalsByTab],
  );

  const hasPendingProposals = useCallback(
    (tabId: string) => (proposalsByTab[tabId]?.length ?? 0) > 0,
    [proposalsByTab],
  );

  const addProposal = useCallback((proposal: Omit<AiEditProposal, "id">) => {
    const id = newProposalId();
    setProposalsByTab((prev) => ({
      ...prev,
      [proposal.tabId]: [...(prev[proposal.tabId] ?? []), { ...proposal, id }],
    }));
    setReviewIndexByTab((prev) => ({
      ...prev,
      [proposal.tabId]: (prev[proposal.tabId] ?? 0),
    }));
    return id;
  }, []);

  const acceptAll = useCallback(
    (tabId: string, content: string, onApply: (next: string) => void) => {
      const proposals = proposalsByTab[tabId] ?? [];
      if (!proposals.length) return;
      const next = applyProposalsToContent(content, proposals);
      onApply(next);
      setProposalsByTab((prev) => ({ ...prev, [tabId]: [] }));
      setReviewIndexByTab((prev) => ({ ...prev, [tabId]: 0 }));
    },
    [proposalsByTab],
  );

  const declineAll = useCallback((tabId: string) => {
    setProposalsByTab((prev) => ({ ...prev, [tabId]: [] }));
    setReviewIndexByTab((prev) => ({ ...prev, [tabId]: 0 }));
  }, []);

  const setReviewIndex = useCallback((tabId: string, index: number) => {
    setReviewIndexByTab((prev) => ({ ...prev, [tabId]: index }));
  }, []);

  const cycleReview = useCallback(
    (tabId: string) => {
      const count = proposalsByTab[tabId]?.length ?? 0;
      if (!count) return;
      setReviewIndexByTab((prev) => ({
        ...prev,
        [tabId]: ((prev[tabId] ?? 0) + 1) % count,
      }));
    },
    [proposalsByTab],
  );

  const getReviewIndex = useCallback(
    (tabId: string) => reviewIndexByTab[tabId] ?? 0,
    [reviewIndexByTab],
  );

  const value = useMemo(
    (): EditorAiProposalContextValue => ({
      proposalsByTab,
      reviewIndexByTab,
      getProposalsForTab,
      hasPendingProposals,
      addProposal,
      acceptAll,
      declineAll,
      setReviewIndex,
      cycleReview,
      getReviewIndex,
    }),
    [
      proposalsByTab,
      reviewIndexByTab,
      getProposalsForTab,
      hasPendingProposals,
      addProposal,
      acceptAll,
      declineAll,
      setReviewIndex,
      cycleReview,
      getReviewIndex,
    ],
  );

  return (
    <EditorAiProposalContext.Provider value={value}>{children}</EditorAiProposalContext.Provider>
  );
}

export function useEditorAiProposals(): EditorAiProposalContextValue {
  const ctx = useContext(EditorAiProposalContext);
  if (!ctx) {
    throw new Error("useEditorAiProposals must be used within EditorAiProposalProvider");
  }
  return ctx;
}

import { memo, useCallback, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { monaco } from "./monacoSetup";
import type { AiEditProposal } from "@/app/synapse-v3/EditorAiProposalContext";
import { applyMonacoTheme, EDITOR_THEME_CHANGED_EVENT } from "./editorThemes";
import { SHELL_THEME_CHANGED_EVENT } from "../ui/shellTheme";
import { registerLuauLanguage } from "./luauLanguage";
import { registerSynapseLuaCompletion } from "./synapseIntellisense";
import { clampMinimapScale, DEFAULT_MINIMAP_SCALE } from "../app/appSettings";
import { useAppSettings } from "../app/useAppSettings";
import { getLuaDiagnostics, updateEditorDecorations } from "./synapseDiagnostics";
import { clearAiProposalUi, updateAiProposalUi } from "./editorAiProposals";
import { useEditorWorkspace } from "../app/editorWorkspace/EditorWorkspaceContext";
import "../styles/editorDiagnostics.css";

export interface ScriptMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Monaco theme id (from `EDITOR_THEME_OPTIONS`) */
  themeId: string;
  readOnly?: boolean;
  proposals?: AiEditProposal[];
  activeProposalIndex?: number;
  onEditorMount?: (editor: monaco.editor.ICodeEditor) => void;
}

const CONTENT_SYNC_MS = 250;

function ScriptMonacoEditor({
  value,
  onChange,
  themeId,
  readOnly,
  proposals = [],
  activeProposalIndex = 0,
  onEditorMount,
}: ScriptMonacoEditorProps) {
  const monacoRef = useRef<typeof monaco | null>(null);
  const editorRef = useRef<monaco.editor.ICodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  const contentSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { settings } = useAppSettings();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleEditorChange = useCallback((next: string | undefined) => {
    const text = next ?? "";
    if (contentSyncTimerRef.current) clearTimeout(contentSyncTimerRef.current);
    contentSyncTimerRef.current = setTimeout(() => {
      contentSyncTimerRef.current = null;
      onChangeRef.current(text);
    }, CONTENT_SYNC_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (contentSyncTimerRef.current) clearTimeout(contentSyncTimerRef.current);
    };
  }, []);
  let workspace: ReturnType<typeof useEditorWorkspace> | null = null;
  try {
    workspace = useEditorWorkspace();
  } catch {
    // ignore outside workspace provider context
  }

  const handleMount: OnMount = (editor, m) => {
    monacoRef.current = m;
    editorRef.current = editor;
    registerLuauLanguage(m);
    registerSynapseLuaCompletion(m);
    applyMonacoTheme(m, themeId);

    const model = editor.getModel();
    if (model) {
      const markers = settings.errorLoggingEnabled ? getLuaDiagnostics(value) : [];
      m.editor.setModelMarkers(model, "Synapse", markers);
      updateEditorDecorations(editor, markers);
    }
    updateAiProposalUi(editor, m, proposals, activeProposalIndex);

    // macOS native option-based word boundary cursor movements & selections
    editor.addCommand(m.KeyMod.Alt | m.KeyCode.LeftArrow, () => {
      editor.trigger("keyboard", "cursorWordLeft", null);
    });
    editor.addCommand(m.KeyMod.Alt | m.KeyCode.RightArrow, () => {
      editor.trigger("keyboard", "cursorWordRight", null);
    });
    editor.addCommand(m.KeyMod.Alt | m.KeyMod.Shift | m.KeyCode.LeftArrow, () => {
      editor.trigger("keyboard", "cursorWordLeftSelect", null);
    });
    editor.addCommand(m.KeyMod.Alt | m.KeyMod.Shift | m.KeyCode.RightArrow, () => {
      editor.trigger("keyboard", "cursorWordRightSelect", null);
    });

    // macOS native option-based word boundary deletions
    editor.addCommand(m.KeyMod.Alt | m.KeyCode.Backspace, () => {
      editor.trigger("keyboard", "deleteWordLeft", null);
    });
    editor.addCommand(m.KeyMod.Alt | m.KeyCode.Delete, () => {
      editor.trigger("keyboard", "deleteWordRight", null);
    });

    // Cmd + S save file binding
    editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.KeyS, () => {
      if (workspace && workspace.saveActiveScriptToFile) {
        void workspace.saveActiveScriptToFile();
      }
    });

    onEditorMount?.(editor);
    editor.focus();
  };

  useEffect(() => {
    const m = monacoRef.current;
    if (m) applyMonacoTheme(m, themeId);
  }, [themeId]);

  useEffect(() => {
    const sync = () => {
      const m = monacoRef.current;
      if (m) applyMonacoTheme(m, themeId);
    };
    window.addEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EDITOR_THEME_CHANGED_EVENT, sync);
      window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [themeId]);

  useEffect(() => {
    if (!settings.errorLoggingEnabled) return;
    const editor = editorRef.current;
    const m = monacoRef.current;
    if (!editor || !m) return;

    const timer = setTimeout(() => {
      const model = editor.getModel();
      if (!model || model.isDisposed()) return;

      const markers = getLuaDiagnostics(value);
      m.editor.setModelMarkers(model, "Synapse", markers);
      m.editor.setModelMarkers(model, "lua", []);
      m.editor.setModelMarkers(model, "luau", []);
      updateEditorDecorations(editor, markers);
    }, 500);

    return () => clearTimeout(timer);
  }, [value, settings.errorLoggingEnabled]);

  useEffect(() => {
    const editor = editorRef.current;
    const m = monacoRef.current;
    if (!editor || !m || editor.getModel()?.isDisposed()) return;
    if (proposals.length) {
      updateAiProposalUi(editor, m, proposals, activeProposalIndex);
    } else {
      clearAiProposalUi(editor);
    }
  }, [proposals, activeProposalIndex]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.getModel()?.isDisposed()) return;
    editor.updateOptions({ readOnly: !!readOnly });
  }, [readOnly]);

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && !editor.getModel()?.isDisposed()) {
        clearAiProposalUi(editor);
      }
    };
  }, []);

  const isV3 = settings.uiMode === "synapseV3";
  const minimapEnabled = settings.minimapEnabled;
  const minimapScale = clampMinimapScale(settings.minimapScale ?? DEFAULT_MINIMAP_SCALE);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.getModel()?.isDisposed()) return;
    editor.updateOptions({
      minimap: { enabled: minimapEnabled, scale: minimapScale },
    });
  }, [minimapEnabled, minimapScale]);

  return (
    <Editor
      className="script-monaco-editor h-full w-full min-h-0 min-w-0 overflow-hidden [&_.monaco-editor]:h-full [&_.monaco-editor]:min-h-0 [&_.monaco-editor_.overflow-guard]:h-full [&_.monaco-editor_.overflow-guard]:min-h-0"
      height="100%"
      width="100%"
      language="luau"
      theme={themeId}
      defaultValue={value}
      onChange={handleEditorChange}
      onMount={handleMount}
      options={{
        readOnly: readOnly,
        minimap: { enabled: minimapEnabled, scale: minimapScale },
        fontSize: isV3 ? 13 : 13,
        lineHeight: isV3 ? 16 : 18,
        suggestFontSize: 13,
        suggestLineHeight: 18,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: "off",
        folding: true,
        links: true,
        renderWhitespace: "none",
        glyphMargin: true,
        lineNumbersMinChars: isV3 ? 2 : 1,
        lineDecorationsWidth: isV3 ? 10 : 0,
        stickyScroll: { enabled: false },
        renderLineHighlight: isV3 ? "line" : "all",
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        padding: { top: 0, bottom: 2 },
        fixedOverflowWidgets: true,
        scrollbar: { useShadows: false },
        overflowWidgetsDomNode:
          typeof document !== "undefined" ? document.body : undefined,
        smoothScrolling: false,
        cursorSmoothCaretAnimation: "off",
        fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Mono\", Menlo, Monaco, Consolas, monospace",
        fontSmoothing: "antialiased",
        pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
      }}
    />
  );
}

export default memo(ScriptMonacoEditor);

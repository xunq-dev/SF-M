import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const suggestPath = path.join(
  root,
  "node_modules/monaco-editor/esm/vs/editor/contrib/suggest/browser/media/suggest.css",
);
const phPath = path.join(
  root,
  "node_modules/monaco-editor/esm/vs/editor/contrib/parameterHints/browser/parameterHints.css",
);
const outPath = path.join(root, "src/styles/monacoOverflowWidgets.css");

let s = fs.readFileSync(suggestPath, "utf8");
// Longest selectors first
s = s.replace(/\.monaco-editor \.suggest-details-container/g, ".suggest-details-container");
s = s.replace(/\.monaco-editor \.suggest-details/g, ".suggest-details");
s = s.replace(/\.monaco-editor \.suggest-widget/g, ".suggest-widget.editor-widget");
// High-contrast blocks don't apply to body-reparented widgets; drop them
s = s.replace(
  /\.monaco-editor\.hc-black \.suggest-widget,\s*\.monaco-editor\.hc-black \.suggest-details,\s*\.monaco-editor\.hc-light \.suggest-widget,\s*\.monaco-editor\.hc-light \.suggest-details\s*\{[^}]*\}\s*/g,
  "",
);

/* Theme tokens are on .monaco-editor; body widgets get invalid var() and broken colors */
const suggestVarFallbacks = [
  ["var(--vscode-editorSuggestWidget-border)", "var(--vscode-editorSuggestWidget-border, #5a5a5a)"],
  ["var(--vscode-editorSuggestWidget-background)", "var(--vscode-editorSuggestWidget-background, #2a2a2a)"],
  ["var(--vscode-editorSuggestWidgetStatus-foreground)", "var(--vscode-editorSuggestWidgetStatus-foreground, #c8c8c8)"],
  ["var(--vscode-editorSuggestWidget-selectedForeground)", "var(--vscode-editorSuggestWidget-selectedForeground, #ffffff)"],
  ["var(--vscode-editorSuggestWidget-selectedIconForeground)", "var(--vscode-editorSuggestWidget-selectedIconForeground, #ffffff)"],
  ["var(--vscode-editorSuggestWidget-foreground)", "var(--vscode-editorSuggestWidget-foreground, #ffffff)"],
  ["var(--vscode-editorSuggestWidget-highlightForeground)", "var(--vscode-editorSuggestWidget-highlightForeground, #00c6ff)"],
  ["var(--vscode-editorSuggestWidget-focusHighlightForeground)", "var(--vscode-editorSuggestWidget-focusHighlightForeground, #00c6ff)"],
  ["var(--vscode-focusBorder)", "var(--vscode-focusBorder, #5a5a5a)"],
  ["var(--vscode-textLink-foreground)", "var(--vscode-textLink-foreground, #006aff)"],
  ["var(--vscode-textLink-activeForeground)", "var(--vscode-textLink-activeForeground, #3a8cff)"],
  ["var(--vscode-textCodeBlock-background)", "var(--vscode-textCodeBlock-background, rgba(0,0,0,0.28))"],
  ["var(--monaco-monospace-font)", "var(--monaco-monospace-font, Consolas, 'Courier New', monospace)"],
];
for (const [from, to] of suggestVarFallbacks) {
  s = s.split(from).join(to);
}

let ph = fs.readFileSync(phPath, "utf8");
ph = ph.replace(
  /\.hc-black \.monaco-editor \.parameter-hints-widget,\s*\.hc-light \.monaco-editor \.parameter-hints-widget\s*\{[^}]*\}\s*/g,
  "",
);
ph = ph.replace(/\.monaco-editor \.parameter-hints-widget/g, ".editor-widget.parameter-hints-widget");

const paramHintVarFallbacks = [
  ["var(--vscode-editorHoverWidget-foreground)", "var(--vscode-editorHoverWidget-foreground, #ffffff)"],
  ["var(--vscode-editorHoverWidget-background)", "var(--vscode-editorHoverWidget-background, #2a2a2a)"],
  ["var(--vscode-editorHoverWidget-border)", "var(--vscode-editorHoverWidget-border, #5a5a5a)"],
  ["var(--vscode-parameterHintsWidget-editorFontFamily)", "var(--vscode-parameterHintsWidget-editorFontFamily, Consolas)"],
  ["var(--vscode-parameterHintsWidget-editorFontFamilyDefault)", "var(--vscode-parameterHintsWidget-editorFontFamilyDefault, monospace)"],
  ["var(--vscode-editorHoverWidget-highlightForeground)", "var(--vscode-editorHoverWidget-highlightForeground, #00c6ff)"],
  ["var(--vscode-textLink-foreground)", "var(--vscode-textLink-foreground, #006aff)"],
  ["var(--vscode-textLink-activeForeground)", "var(--vscode-textLink-activeForeground, #3a8cff)"],
  ["var(--vscode-textCodeBlock-background)", "var(--vscode-textCodeBlock-background, rgba(0,0,0,0.28))"],
  ["var(--monaco-monospace-font)", "var(--monaco-monospace-font, Consolas, 'Courier New', monospace)"],
];
for (const [from, to] of paramHintVarFallbacks) {
  ph = ph.split(from).join(to);
}

const header = `/**
 * Layout for Monaco widgets reparented to document.body (ScriptMonacoEditor overflowWidgetsDomNode).
 * Monaco's built-in rules are scoped under .monaco-editor; detached widgets would have no layout.
 * Derived from monaco-editor suggest.css + parameterHints.css (selectors rewritten).
 */

`;

const overrides = `
/* Stacking + theme fallbacks: CSS vars are normally defined on .monaco-editor only */
.suggest-widget.editor-widget {
  z-index: 10000 !important;
  font-family: Consolas, "Courier New", monospace !important;
}

.suggest-details-container {
  z-index: 10001 !important;
  font-family: Consolas, "Courier New", monospace !important;
}

.suggest-details {
  font-family: Consolas, "Courier New", monospace !important;
}

/* Below completion list (Monaco uses 39 vs 40 on suggest) */
.editor-widget.parameter-hints-widget {
  z-index: 9998 !important;
  font-family: Consolas, "Courier New", monospace !important;
}

.suggest-widget.editor-widget,
.suggest-details {
  border-color: var(--vscode-editorSuggestWidget-border, #5a5a5a) !important;
  background-color: var(--vscode-editorSuggestWidget-background, #2a2a2a) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45) !important;
  box-sizing: border-box !important;
}

/*
 * Text colors: VS Code theme vars are undefined on document.body, so monaco’s
 * var(--vscode-editorSuggestWidget-*) rules make labels/codicons invisible or wrong.
 * Use full selector chains + .codicon.codicon-symbol-* so we beat .focused .codicon.
 */
.suggest-widget.editor-widget .monaco-list .monaco-list-row {
  color: #ffffff !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row.focused {
  color: #ffffff !important;
}
.suggest-widget.editor-widget
  .monaco-list
  .monaco-list-row:not(.focused)
  > .contents
  > .main
  .monaco-icon-label,
.suggest-widget.editor-widget
  .monaco-list
  .monaco-list-row.focused
  > .contents
  > .main
  .monaco-icon-label,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .monaco-icon-label .label-name,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .monaco-icon-label .monaco-icon-name-container {
  color: #ffffff !important;
}
.suggest-widget.editor-widget
  .monaco-list
  .monaco-list-row
  > .contents
  > .main
  .monaco-highlighted-label {
  color: #ffffff !important;
}

.suggest-details,
.suggest-details .monaco-tokenized-source {
  color: #ffffff !important;
}

.suggest-details a {
  color: #006aff !important;
}

.suggest-details a:hover {
  color: #3a8cff !important;
}

.suggest-details code {
  color: #c8c8c8 !important;
  background-color: rgba(64, 128, 128, 0.35) !important;
}

/* Filter / match highlight — Synapse Number */
.suggest-widget.editor-widget .monaco-list .monaco-list-row .monaco-highlighted-label .highlight,
.suggest-widget.editor-widget
  .monaco-list
  .monaco-list-row.focused
  .monaco-highlighted-label
  .highlight {
  color: #00c6ff !important;
}

/* Right-side type / detail */
.suggest-widget.editor-widget .monaco-list .monaco-list-row > .contents > .main > .right > .details-label {
  color: #c8c8c8 !important;
  opacity: 1 !important;
}

.suggest-widget.editor-widget .monaco-list .monaco-list-row > .contents > .main > .left > .qualifier-label {
  color: #7f7f7f !important;
  opacity: 1 !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row > .contents > .main > .left > .signature-label {
  color: #c8c8c8 !important;
  opacity: 1 !important;
}

.suggest-widget.editor-widget .suggest-status-bar,
.suggest-widget.editor-widget .suggest-status-bar .action-label {
  color: #c8c8c8 !important;
}

.editor-widget.parameter-hints-widget {
  color: #ffffff !important;
  background-color: var(--vscode-editorHoverWidget-background, #2a2a2a) !important;
  border-color: var(--vscode-editorHoverWidget-border, #5a5a5a) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45) !important;
  box-sizing: border-box !important;
}

.editor-widget.parameter-hints-widget .signature {
  color: #ffffff !important;
}

.editor-widget.parameter-hints-widget .documentation-parameter,
.editor-widget.parameter-hints-widget .docs {
  color: #c8c8c8 !important;
}

.editor-widget.parameter-hints-widget .signature .parameter.active {
  color: #00c6ff !important;
}

.editor-widget.parameter-hints-widget .docs a {
  color: #006aff !important;
}

.editor-widget.parameter-hints-widget .docs a:hover {
  color: #3a8cff !important;
}

.editor-widget.parameter-hints-widget .docs code {
  color: #c8c8c8 !important;
  background-color: rgba(64, 128, 128, 0.35) !important;
}

.editor-widget.parameter-hints-widget.multiple .body::before {
  border-left-color: var(--vscode-editorHoverWidget-border, #5a5a5a) !important;
}

.editor-widget.parameter-hints-widget .signature.has-docs::after {
  border-bottom-color: var(--vscode-editorHoverWidget-border, #5a5a5a) !important;
}

.suggest-widget.editor-widget .monaco-list .monaco-list-row.focused,
.suggest-widget.editor-widget .monaco-list .monaco-list-row:hover {
  background: var(--vscode-editorSuggestWidget-selectedBackground, #3a3a3a) !important;
}

/*
 * Kind icons — SynapseX GetDarkPalette(); use .codicon.codicon-symbol-* so we beat
 * .monaco-list-row.focused .codicon { color: var(...) }.
 */
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-method,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-function,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-constructor,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-operator {
  color: #3a8cff !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-class,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-struct,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-interface,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-namespace,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-module {
  color: #006aff !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-variable,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-field,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-property,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-type-parameter,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-value {
  color: #c8c8c8 !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-keyword {
  color: #006aff !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-constant,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-enum,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-enum-member {
  color: #00c6ff !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-text,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-snippet,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-reference {
  color: #7f7f7f !important;
}
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-color,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-file,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-folder,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-event,
.suggest-widget.editor-widget .monaco-list .monaco-list-row .codicon.codicon-symbol-unit {
  color: #408080 !important;
}
`;

fs.writeFileSync(outPath, header + s + "\n\n" + ph + overrides);
console.log("wrote", outPath);

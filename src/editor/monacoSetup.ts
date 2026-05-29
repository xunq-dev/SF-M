import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

/**
 * Required when bundling Monaco with Vite (`loader.config({ monaco })`).
 * Luau editing only needs the core editor worker.
 */
if (typeof globalThis !== "undefined" && !globalThis.MonacoEnvironment) {
  globalThis.MonacoEnvironment = {
    getWorker() {
      return new editorWorker();
    },
  };
}

loader.config({ monaco });

export { monaco };

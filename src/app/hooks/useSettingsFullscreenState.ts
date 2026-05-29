import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauriApp } from "@/app/tauriEnv";

export function useSettingsFullscreenState() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  useEffect(() => {
    if (!isTauriApp()) return;
    const win = getCurrentWindow();
    
    const checkMaximized = async () => {
      setIsMaximized(await win.isMaximized());
    };
    
    checkMaximized();
    const unlisten = win.onResized(() => {
      checkMaximized();
    });
    
    return () => {
      void unlisten.then(u => u());
    };
  }, []);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsScrolledToBottom(atBottom);
  };

  return {
    isMaximized,
    isScrolledToBottom,
    onScroll,
    showPreview: isMaximized || isScrolledToBottom,
  };
}

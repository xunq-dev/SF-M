import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MacSploitManager } from "../executorBridge/MacSploitManager";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function MacSploitNotification() {
  const manager = MacSploitManager.getInstance();
  const [notification, setNotification] = useState<{
    type: "attached" | "detached";
    timestamp: number;
    mode: string;
  } | null>(null);

  const handleAttached = useCallback(() => {
    setNotification({ type: "attached", timestamp: Date.now(), mode: manager.getStatus().mode });
    setTimeout(() => setNotification(null), 3000);
  }, [manager]);

  const handleDetached = useCallback(() => {
    setNotification({ type: "detached", timestamp: Date.now(), mode: manager.getStatus().mode });
    setTimeout(() => setNotification(null), 3000);
  }, [manager]);

  useEffect(() => {
    manager.addEventListener("attached", handleAttached);
    manager.addEventListener("detached", handleDetached);

    return () => {
      manager.removeEventListener("attached", handleAttached);
      manager.removeEventListener("detached", handleDetached);
    };
  }, [handleAttached, handleDetached, manager]);

  const bgClass = useMemo(() => {
    if (!notification) return "";
    return notification.type === "attached"
      ? "bg-emerald-900/90 text-emerald-100 border border-emerald-700"
      : "bg-amber-900/90 text-amber-100 border border-amber-700";
  }, [notification?.type, notification?.mode]);

  const content = useMemo(() => {
    if (!notification) return null;
    const label =
      notification.mode === "simulation" ? "Simulation" : notification.mode === "opiumware" ? "Opiumware" : "MacSploit";
    if (notification.type === "attached") {
      return (
        <>
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Attached to {label}</span>
        </>
      );
    }
    return (
      <>
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">Detached from {label}</span>
      </>
    );
  }, [notification?.type, notification?.mode]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={`notification-${notification.timestamp}`}
          initial={{ opacity: 0, y: -20, x: -20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -20, x: -20 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${bgClass}`}>
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

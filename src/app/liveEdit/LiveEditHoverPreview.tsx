import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PreviewState = {
  rect: DOMRect;
  label: string;
} | null;

export type LiveEditHoverPreviewProps = {
  enabled: boolean;
  popoverOpen: boolean;
  resolveTargetAt: (clientX: number, clientY: number) => { element: HTMLElement | SVGElement; path: string } | null;
  getLabelForPath: (path: string) => string | null;
  popoverSelector?: string;
  bodyClass?: string;
  outlineColor?: string;
  pillBg?: string;
  pillText?: string;
  persistLastTarget?: boolean;
};

const FADE_MS = 150;

export function LiveEditHoverPreview({
  enabled,
  popoverOpen,
  resolveTargetAt,
  getLabelForPath,
  popoverSelector = "[data-live-edit-popover]",
  bodyClass = "live-edit-active",
  outlineColor = "var(--v3-accent-primary, #5ee85e)",
  pillBg = "var(--v3-accent-primary, #5ee85e)",
  pillText = "#0f1a0f",
  persistLastTarget = false,
}: LiveEditHoverPreviewProps) {
  const [preview, setPreview] = useState<PreviewState>(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastMoveRef = useRef(0);
  const fadeTimerRef = useRef<number | null>(null);
  const previewRef = useRef<PreviewState>(null);
  previewRef.current = preview;

  useEffect(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (!enabled) {
      if (previewRef.current) {
        setVisible(false);
        fadeTimerRef.current = window.setTimeout(() => {
          setPreview(null);
          fadeTimerRef.current = null;
        }, FADE_MS);
      }
      return;
    }

    if (popoverOpen) {
      setPreview(null);
      setVisible(false);
      return;
    }

    setVisible(true);
    document.body.classList.add(bodyClass);
    document.body.style.cursor = "crosshair";

    const update = (clientX: number, clientY: number) => {
      const hit = resolveTargetAt(clientX, clientY);
      if (!hit) {
        if (!persistLastTarget) {
          setPreview(null);
        }
        return;
      }
      const label = getLabelForPath(hit.path);
      if (!label) {
        if (!persistLastTarget) {
          setPreview(null);
        }
        return;
      }
      setPreview({
        rect: hit.element.getBoundingClientRect(),
        label,
      });
      setVisible(true);
    };

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMoveRef.current < 30) return;
      lastMoveRef.current = now;

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (e.target instanceof Element && e.target.closest(popoverSelector)) {
          if (!persistLastTarget) setPreview(null);
          return;
        }
        update(e.clientX, e.clientY);
      });
    };

    const onLeave = () => {
      if (!persistLastTarget) setPreview(null);
    };

    window.addEventListener("mousemove", onMove, true);
    window.addEventListener("blur", onLeave);
    return () => {
      document.body.classList.remove(bodyClass);
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("blur", onLeave);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, popoverOpen, resolveTargetAt, getLabelForPath, popoverSelector, bodyClass, persistLastTarget]);

  if (!preview) return null;

  const pad = 1;
  const pillTop = Math.max(8, preview.rect.top - 26);
  const pillLeft = Math.min(
    Math.max(8, preview.rect.left),
    window.innerWidth - 220,
  );
  const fadeStyle = {
    opacity: enabled && visible ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-out`,
  };

  return createPortal(
    <>
      <div
        className="pointer-events-none fixed z-[9998] rounded-sm border-2 border-solid"
        style={{
          left: preview.rect.left - pad,
          top: preview.rect.top - pad,
          width: preview.rect.width + pad * 2,
          height: preview.rect.height + pad * 2,
          borderColor: outlineColor,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
          ...fadeStyle,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed z-[9998] max-w-[220px] truncate rounded px-2 py-0.5 text-[10px] font-medium"
        style={{
          left: pillLeft,
          top: pillTop,
          color: pillText,
          background: pillBg,
          fontFamily: "Inter, sans-serif",
          ...fadeStyle,
        }}
      >
        {preview.label}
      </div>
    </>,
    document.body,
  );
}

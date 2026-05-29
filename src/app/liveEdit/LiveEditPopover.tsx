import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  colorAlpha,
  colorToHexInput,
  composeColor,
  type LiveEditColorFormat,
} from "./liveEditColorUtils";

export type LiveEditPopoverProps = {
  x: number;
  y: number;
  label: string;
  format: LiveEditColorFormat;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  popoverAttr?: string;
};

export function LiveEditPopover({
  x,
  y,
  label,
  format,
  value,
  onChange,
  onClose,
  popoverAttr = "data-live-edit-popover",
}: LiveEditPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hex = colorToHexInput(value);
  const alpha = colorAlpha(value);
  const popoverSelector = `[${popoverAttr}]`;

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest(popoverSelector)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, popoverSelector]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - rect.width - pad);
    }
    if (top + rect.height > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - rect.height - pad);
    }
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y, label, format, value]);

  return createPortal(
    <div
      ref={rootRef}
      {...{ [popoverAttr]: true }}
      className="fixed z-[9999] min-w-[220px] rounded border border-solid border-[#404040] bg-[#1e1e1e] p-3 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="mb-2 text-[12px] font-medium text-white">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-8 w-8 shrink-0 rounded border border-solid border-black/30"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(composeColor(format, e.target.value, alpha))}
          aria-label={label}
          className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="font-mono text-[11px] text-[#b0b0b0]">{value}</span>
      </div>
      {format === "rgba" ? (
        <label className="mt-3 flex items-center gap-2 text-[11px] text-[#b0b0b0]">
          Opacity
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(alpha * 100)}
            onChange={(e) =>
              onChange(composeColor(format, hex, Number(e.target.value) / 100))
            }
            className="flex-1 accent-[#5a9fd4]"
          />
          <span className="w-8 text-right tabular-nums">{Math.round(alpha * 100)}%</span>
        </label>
      ) : null}
    </div>,
    document.body,
  );
}

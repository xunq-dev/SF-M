import { useCallback, useEffect, useRef, type ReactNode } from "react";
import svgSettingsPaths from "../remake-assets/settings-svg-paths/v3-settings-svg-paths";

export function V3Checkmark() {
  return (
    <svg viewBox="0 0 13.5 9.5" width={13} height={9} fill="none">
      <path
        d={svgSettingsPaths.p31d6ffa0}
        stroke="#0F2433"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.1}
      />
    </svg>
  );
}

export function V3SettingCheckbox({
  value,
  onChange,
  disabled = false,
  liveEditPath,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  liveEditPath?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="relative rounded-[3px] border border-solid flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        width: 30,
        height: 30,
        borderColor: "var(--v3-settings-desc, #7e7e7e)",
        background: value
          ? "var(--v3-settings-checkbox-on, #b0d8e5)"
          : "var(--v3-settings-checkbox-off, #212120)",
      }}
      data-v3-live={liveEditPath}
      onClick={() => {
        if (disabled) return;
        onChange(!value);
      }}
      aria-pressed={value}
      aria-label={value ? "Enabled" : "Disabled"}
      aria-disabled={disabled}
    >
      {value && <V3Checkmark />}
    </button>
  );
}

export function V3SectionHeader({
  id,
  icon,
  title,
  liveEditPath,
}: {
  id?: string;
  icon: ReactNode;
  title: string;
  liveEditPath?: string;
}) {
  return (
    <div
      id={id}
      className="flex items-center rounded-[4px] shadow-[0px_0px_9.2px_0px_rgba(0,0,0,0.53)] mb-4"
      style={{
        background: "var(--v3-settings-section-bg, #303030)",
        height: 33,
        padding: "0 12px",
      }}
      data-v3-live={liveEditPath}
    >
      <span
        className="mr-2"
        data-v3-live={liveEditPath ? "settingsChrome.sectionIcon" : undefined}
      >
        {icon}
      </span>
      <span
        className="text-white"
        data-v3-live={liveEditPath ? "settingsChrome.labelText" : undefined}
        style={{
          fontSize: 16,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          color: "var(--v3-settings-label, #ffffff)",
        }}
      >
        {title}
      </span>
    </div>
  );
}

export function V3SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-[22px]">
      <div className="flex-1 min-w-0">
        <p
          className="mb-[4px]"
          data-v3-live="settingsChrome.labelText"
          style={{
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            color: "var(--v3-settings-label, #ffffff)",
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 13,
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            color: "var(--v3-settings-desc, #6b6b6b)",
          }}
        >
          {description}
        </p>
      </div>
      <div className="ml-4 flex-shrink-0">{control}</div>
    </div>
  );
}

export function V3ColorRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 mb-3 rounded-[4px] border border-solid px-3 py-2"
      style={{
        background: "var(--v3-shell-content-bg, #2a2a2a)",
        borderColor: "var(--v3-editor-tab-border, #3a3a3a)",
        minHeight: 52,
      }}
    >
      <div className="relative h-[36px] w-[100px] shrink-0">
        <div
          className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center gap-1 rounded-[3px] border border-solid"
          style={{
            borderColor: "var(--v3-editor-tab-border, #3a3a3a)",
            background: "var(--v3-editor-tab-inactive, #212120)",
          }}
        >
          <span
            className="inline-block h-[18px] w-[18px] shrink-0 border border-solid border-black/30"
            style={{ backgroundColor: value }}
            aria-hidden
          />
          <span className="font-mono text-[11px] text-white">{value.toUpperCase()}</span>
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="absolute inset-0 z-[3] h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="text-[13px] leading-tight"
          style={{ color: "var(--v3-settings-label, #ffffff)" }}
        >
          {label}
        </p>
        <p
          className="text-[11px] leading-snug"
          style={{ color: "var(--v3-settings-desc, #6b6b6b)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export function V3SliderRow({
  label,
  description,
  value,
  min,
  max,
  onChange,
  formatValue,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <V3SettingRow
      label={label}
      description={description}
      control={
        <div className="flex flex-col items-end gap-1" style={{ width: 140 }}>
          <span
            className="text-[12px] tabular-nums"
            style={{ color: "var(--v3-accent-muted, #b0d8e5)" }}
          >
            {display}
          </span>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-[var(--v3-accent-primary,#225a7a)]"
            aria-label={label}
          />
        </div>
      }
    />
  );
}

export function V3LinkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left text-[12px] underline underline-offset-2 hover:brightness-125"
      style={{ color: "var(--v3-accent-muted, #b0d8e5)" }}
    >
      {children}
    </button>
  );
}

export type V3SidebarItem<T extends string> = {
  id: T;
  icon: ReactNode;
  label: string;
};

export function useV3ScrollSpy<T extends string>(
  sectionIds: Record<T, string>,
  sectionOrder: T[],
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(true);

  const handleScroll = useCallback(() => {
    if (!isUserScrolling.current) return;
    const container = scrollRef.current;
    if (!container) return;
    let current: T = sectionOrder[0];
    for (const sid of sectionOrder) {
      const el = document.getElementById(sectionIds[sid]);
      if (el) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top - containerRect.top <= 40) {
          current = sid;
        }
      }
    }
    return current;
  }, [sectionIds, sectionOrder]);

  const scrollToSection = useCallback(
    (id: T, onActive: (id: T) => void) => {
      const el = document.getElementById(sectionIds[id]);
      if (el) {
        isUserScrolling.current = false;
        onActive(id);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
          isUserScrolling.current = true;
        }, 600);
      }
    },
    [sectionIds],
  );

  return { scrollRef, handleScroll, scrollToSection, isUserScrolling };
}

const SIDEBAR_RAIL_CLASS = "v3-page-sidebar-rail";

export function V3PageSidebar<T extends string>({
  items,
  activeId,
  onSelect,
}: {
  items: V3SidebarItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
}) {
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const btn = buttonRefs.current.get(activeId);
    if (btn) {
      btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeId]);

  return (
    <div
      className="absolute"
      style={{ left: 0, top: 43, width: 58, bottom: 0, borderBottomLeftRadius: 7 }}
    >
      <div
        className={SIDEBAR_RAIL_CLASS}
        style={{
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingTop: 4,
          paddingBottom: 8,
        }}
      >
        <div className="flex flex-col items-center gap-[9px] px-[3px]">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  if (el) buttonRefs.current.set(item.id, el);
                  else buttonRefs.current.delete(item.id);
                }}
                type="button"
                data-sidebar-id={item.id}
                onClick={() => onSelect(item.id)}
                className="relative flex shrink-0 items-center justify-center transition-colors"
                style={{
                  width: 51,
                  height: 36,
                  background: isActive
                    ? "var(--v3-settings-sidebar-active, #313131)"
                    : "transparent",
                  borderRadius: 4,
                }}
                title={item.label}
              >
                {item.icon}
                {isActive && (
                  <div
                    className="absolute left-0 top-[4px] bottom-[4px] rounded-r-[2px]"
                    style={{
                      width: 3,
                      background: "var(--v3-settings-sidebar-accent, #bdd3de)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`.${SIDEBAR_RAIL_CLASS}::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

/** Shared page chrome: top bar offset content + left rail layout */
/** Compact footer row for theme page advanced toggle (avoids clipping). */
export function V3ThemeFooterToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-3">
      <div className="min-w-0 flex-1 pr-2">
        <p
          className="leading-tight"
          style={{
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
            color: "var(--v3-settings-label, #ffffff)",
          }}
        >
          {label}
        </p>
        <p
          className="leading-snug mt-0.5"
          style={{
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            color: "var(--v3-settings-desc, #6b6b6b)",
          }}
        >
          {description}
        </p>
      </div>
      <V3SettingCheckbox value={value} onChange={onChange} />
    </div>
  );
}

export function V3PanelContent({
  children,
  scrollRef,
  onScroll,
  footer,
}: {
  children: ReactNode;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: () => void;
  footer?: ReactNode;
}) {
  return (
    <div
      className="absolute overflow-hidden"
      data-v3-live="shell.pageBg"
      style={{
        left: 58,
        top: 43,
        right: 0,
        bottom: 0,
        background: "var(--v3-shell-page-bg, #151515)",
        borderBottomRightRadius: 7,
      }}
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="absolute"
        style={{
          left: 0,
          top: 0,
          right: 0,
          bottom: footer ? 72 : 0,
          overflowY: "auto",
          padding: "8px 10px 16px 10px",
          scrollbarWidth: "thin",
          scrollbarColor: "#808080 transparent",
        }}
      >
        {children}
        <div style={{ height: 120 }} />
      </div>
      {footer ? (
        <div
          className="absolute left-0 right-0 bottom-0 flex items-center border-t border-solid overflow-visible"
          style={{
            minHeight: 72,
            padding: "10px 12px",
            borderColor: "var(--v3-editor-tab-border, #3a3a3a)",
            background: "var(--v3-shell-page-bg, #151515)",
            zIndex: 5,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

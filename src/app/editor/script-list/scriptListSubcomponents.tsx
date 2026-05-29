import { useState, type ReactNode } from "react";
import type { WorkspaceScriptEntry } from "@/app/scripts/workspaceScriptTypes";
import type { V3GistEntry } from "@/app/synapse-v3/v3Gists";
import { V3FluentIcon } from "@/app/synapse-v3/components/V3FluentIcon";
import type { V3HollywoodFluentIconName } from "@/app/synapse-v3/remake-assets/v3HollywoodFluentIcons";
import svgPaths from "@/app/synapse-v3/remake-assets/v3-svg-paths";
import type { ScriptListLayoutMetrics } from "./ScriptListThemeTokens";
import {
  scriptListCssVar,
  scriptListLiveAttr,
  type ScriptListThemeVariant,
} from "./useScriptListThemeVars";

const ROW_ICON_MAP: Record<
  | "document"
  | "github"
  | "hardDrive"
  | "arrowSync"
  | "bookmark"
  | "refresh"
  | "play"
  | "folderLink",
  V3HollywoodFluentIconName
> = {
  document: "document20Filled",
  github: "github24",
  hardDrive: "hardDrive20Filled",
  arrowSync: "arrowSync20Filled",
  bookmark: "bookmark20Filled",
  refresh: "arrowClockwise20Filled",
  play: "play20Filled",
  folderLink: "folderLink20Filled",
};

function RowIcon({
  name,
  size,
  color,
}: {
  name: keyof typeof ROW_ICON_MAP;
  size: number;
  color: string;
}) {
  return <V3FluentIcon name={ROW_ICON_MAP[name]} size={size} color={color} />;
}

function OpenInEditorIcon({ size, color }: { size: number; color: string }) {
  return <V3FluentIcon name="documentArrowUp20Filled" size={size} color={color} />;
}

export function SectionHeader({
  variant,
  label,
  icon,
  isOpen,
  onToggle,
  trailing,
  layout,
}: {
  variant: ScriptListThemeVariant;
  label: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  layout: ScriptListLayoutMetrics;
}) {
  return (
    <div
      className="flex items-center cursor-pointer select-none shrink-0 min-w-0 w-full overflow-hidden"
      style={{
        height: layout.sectionHeaderHeight,
        background: scriptListCssVar(variant, "sectionHeaderBg"),
      }}
      {...scriptListLiveAttr(variant, "sectionHeaderBg")}
      onClick={onToggle}
    >
      <div
        className="ml-1 flex items-center justify-center"
        style={{ width: layout.chevronWidth, height: layout.chevronHeight }}
      >
        <svg
          viewBox="0 0 10 7"
          width={layout.chevronWidth}
          height={layout.chevronHeight}
          fill="none"
          className="transition-transform"
          style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <path
            d={variant === "v3" ? svgPaths.p11848c00 : "M1 1L5 5L9 1"}
            stroke={scriptListCssVar(variant, "sectionIcon")}
            strokeWidth={1.1}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div
        className="ml-0.5 flex shrink-0 items-center justify-center overflow-hidden"
        style={{ width: layout.sectionIconSize, height: layout.sectionIconSize }}
        {...scriptListLiveAttr(variant, "sectionIcon")}
      >
        {icon}
      </div>
      <span
        className="ml-0.5 flex-1 min-w-0 truncate"
        {...scriptListLiveAttr(variant, "sectionHeaderText")}
        style={{
          fontSize: layout.sectionFontSize,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          color: scriptListCssVar(variant, "sectionHeaderText"),
        }}
      >
        {label}
      </span>
      {trailing ? (
        <div className="mr-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

function RowActions({
  layout,
  bridgeConnected,
  executeIconColor,
  executeIconDisabledColor,
  rowActionIconSize,
  isBookmarked,
  showBookmark,
  compact,
  onExecute,
  onOpen,
  onToggleBookmark,
  onOpenLocation,
  openLocationTitle = "Open file location",
  onRemove,
}: {
  layout: ScriptListLayoutMetrics;
  bridgeConnected: boolean;
  executeIconColor: string;
  executeIconDisabledColor: string;
  rowActionIconSize: number;
  isBookmarked: boolean;
  showBookmark: boolean;
  compact?: boolean;
  onExecute: () => void;
  onOpen: () => void;
  onToggleBookmark: () => void;
  onOpenLocation?: () => void;
  openLocationTitle?: string;
  onRemove?: () => void;
}) {
  const actionColor = "#8e8e8e";
  const btnSize = compact ? Math.max(12, layout.actionButtonSize - 2) : layout.actionButtonSize;
  const iconSize = compact ? Math.max(8, rowActionIconSize - 1) : rowActionIconSize;

  return (
    <div className="flex items-center gap-px shrink-0">
      <button
        type="button"
        className={`flex items-center justify-center rounded ${
          bridgeConnected ? "hover:bg-white/10" : "cursor-not-allowed opacity-50"
        }`}
        style={{ width: btnSize, height: btnSize }}
        onClick={(e) => {
          e.stopPropagation();
          if (bridgeConnected) onExecute();
        }}
        title={bridgeConnected ? "Execute" : "Not attached — run the bridge script in your executor"}
        aria-disabled={!bridgeConnected}
      >
        <RowIcon
          name="play"
          size={iconSize}
          color={bridgeConnected ? executeIconColor : executeIconDisabledColor}
        />
      </button>
      <button
        type="button"
        className="flex items-center justify-center rounded hover:bg-white/10"
        style={{ width: btnSize, height: btnSize }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        title="Open in Editor"
      >
        <OpenInEditorIcon size={iconSize} color={actionColor} />
      </button>
      {showBookmark ? (
        <button
          type="button"
          className="flex items-center justify-center rounded hover:bg-white/10"
          style={{ width: btnSize, height: btnSize }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark();
          }}
          title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
        >
          <RowIcon
            name="bookmark"
            size={iconSize}
            color={isBookmarked ? "#e2b340" : actionColor}
          />
        </button>
      ) : null}
      {onOpenLocation ? (
        <button
          type="button"
          className="flex items-center justify-center rounded hover:bg-white/10"
          style={{ width: btnSize, height: btnSize }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenLocation();
          }}
          title={openLocationTitle}
        >
          <RowIcon name="folderLink" size={iconSize} color={actionColor} />
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className="flex items-center justify-center rounded hover:bg-white/10"
          style={{ width: btnSize, height: btnSize }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove"
        >
          <svg viewBox="0 0 10 10" width={iconSize - 1} height={iconSize - 1} fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke={actionColor} strokeWidth={1.1} strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function ScriptRow({
  variant,
  script,
  isBookmarked,
  bridgeConnected,
  executeIconColor,
  executeIconDisabledColor,
  rowIconSize,
  rowActionIconSize,
  layout,
  onExecute,
  onOpen,
  onToggleBookmark,
  onRevealInExplorer,
  showBookmark = true,
}: {
  variant: ScriptListThemeVariant;
  script: WorkspaceScriptEntry;
  isBookmarked: boolean;
  bridgeConnected: boolean;
  executeIconColor: string;
  executeIconDisabledColor: string;
  rowIconSize: number;
  rowActionIconSize: number;
  layout: ScriptListLayoutMetrics;
  onExecute: () => void;
  onOpen: () => void;
  onToggleBookmark: () => void;
  onRevealInExplorer?: () => void;
  showBookmark?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const muted = scriptListCssVar(variant, "sectionIcon");
  const hoverBg = scriptListCssVar(variant, "rowHoverBg");
  const compact = variant === "shell" || variant === "sx";

  return (
    <div
      className="relative flex items-center cursor-pointer group min-w-0 w-full overflow-hidden"
      style={{
        height: layout.rowHeight,
        minHeight: layout.rowHeight,
        paddingLeft: layout.rowPaddingX,
        paddingRight: layout.rowPaddingX,
        background: hovered ? hoverBg : "transparent",
      }}
      {...scriptListLiveAttr(variant, "rowHoverBg")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onOpen}
    >
      <span
        className="shrink-0 mr-0.5 flex items-center justify-center overflow-hidden"
        style={{ width: rowIconSize, height: rowIconSize }}
      >
        <RowIcon name="document" size={rowIconSize} color={muted} />
      </span>
      <span
        className="truncate flex-1 min-w-0"
        {...scriptListLiveAttr(variant, "rowText")}
        style={{
          fontSize: layout.rowFontSize,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          color: scriptListCssVar(variant, "rowText"),
        }}
      >
        {script.title}
      </span>
      {hovered ? (
        <div
          className="absolute inset-y-0 right-0 flex items-center pr-0.5 pl-3"
          style={{
            background: `linear-gradient(to right, transparent, ${hoverBg} 40%, ${hoverBg})`,
          }}
        >
          <RowActions
            layout={layout}
            compact={compact}
            bridgeConnected={bridgeConnected}
            executeIconColor={executeIconColor}
            executeIconDisabledColor={executeIconDisabledColor}
            rowActionIconSize={rowActionIconSize}
            isBookmarked={isBookmarked}
            showBookmark={showBookmark}
            onExecute={onExecute}
            onOpen={onOpen}
            onToggleBookmark={onToggleBookmark}
            onOpenLocation={onRevealInExplorer}
          />
        </div>
      ) : null}
    </div>
  );
}

export function GistRow({
  variant,
  gist,
  isBookmarked,
  bridgeConnected,
  executeIconColor,
  executeIconDisabledColor,
  rowIconSize,
  rowActionIconSize,
  layout,
  loading,
  onExecute,
  onOpen,
  onToggleBookmark,
  onOpenGistLink,
  onRemove,
  showBookmark = true,
}: {
  variant: ScriptListThemeVariant;
  gist: V3GistEntry;
  isBookmarked: boolean;
  bridgeConnected: boolean;
  executeIconColor: string;
  executeIconDisabledColor: string;
  rowIconSize: number;
  rowActionIconSize: number;
  layout: ScriptListLayoutMetrics;
  loading?: boolean;
  onExecute: () => void;
  onOpen: () => void;
  onToggleBookmark: () => void;
  onOpenGistLink?: () => void;
  onRemove: () => void;
  showBookmark?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const muted = scriptListCssVar(variant, "sectionIcon");
  const hoverBg = scriptListCssVar(variant, "rowHoverBg");
  const compact = variant === "shell" || variant === "sx";

  return (
    <div
      className="relative flex items-center cursor-pointer group min-w-0 w-full overflow-hidden"
      style={{
        height: layout.rowHeight,
        minHeight: layout.rowHeight,
        paddingLeft: layout.rowPaddingX,
        paddingRight: layout.rowPaddingX,
        background: hovered ? hoverBg : "transparent",
        opacity: loading ? 0.6 : 1,
      }}
      {...scriptListLiveAttr(variant, "rowHoverBg")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onOpen}
      title={gist.rawUrl}
    >
      <span
        className="shrink-0 mr-0.5 flex items-center justify-center overflow-hidden"
        style={{ width: rowIconSize, height: rowIconSize }}
      >
        <RowIcon name="github" size={rowIconSize} color={muted} />
      </span>
      <span
        className="truncate flex-1 min-w-0"
        {...scriptListLiveAttr(variant, "rowText")}
        style={{
          fontSize: layout.rowFontSize,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          color: scriptListCssVar(variant, "rowText"),
        }}
      >
        {loading ? `${gist.title}…` : gist.title}
      </span>
      {hovered && !loading ? (
        <div
          className="absolute inset-y-0 right-0 flex items-center pr-0.5 pl-3"
          style={{
            background: `linear-gradient(to right, transparent, ${hoverBg} 40%, ${hoverBg})`,
          }}
        >
          <RowActions
            layout={layout}
            compact={compact}
            bridgeConnected={bridgeConnected}
            executeIconColor={executeIconColor}
            executeIconDisabledColor={executeIconDisabledColor}
            rowActionIconSize={rowActionIconSize}
            isBookmarked={isBookmarked}
            showBookmark={showBookmark}
            onExecute={onExecute}
            onOpen={onOpen}
            onToggleBookmark={onToggleBookmark}
            onOpenLocation={onOpenGistLink}
            openLocationTitle="Open gist link"
            onRemove={onRemove}
          />
        </div>
      ) : null}
    </div>
  );
}

export function SectionEmpty({
  variant,
  children,
  layout,
}: {
  variant: ScriptListThemeVariant;
  children: ReactNode;
  layout: ScriptListLayoutMetrics;
}) {
  return (
    <div
      className="px-1.5 py-1 break-words"
      style={{
        fontSize: layout.emptyFontSize,
        fontFamily: "Inter, sans-serif",
        color: scriptListCssVar(variant, "rowMutedText"),
      }}
      {...scriptListLiveAttr(variant, "rowMutedText")}
    >
      {children}
    </div>
  );
}

export { RowIcon };

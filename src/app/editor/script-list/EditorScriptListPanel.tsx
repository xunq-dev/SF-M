import { useMemo, useState, type CSSProperties } from "react";
import type { WorkspaceScriptEntry } from "@/app/scripts/workspaceScriptTypes";
import type { V3GistEntry } from "@/app/synapse-v3/v3Gists";
import {
  resolveScriptListLayout,
  SCRIPT_LIST_PANEL_WIDTH,
} from "./ScriptListThemeTokens";
import {
  GistRow,
  RowIcon,
  ScriptRow,
  SectionEmpty,
  SectionHeader,
} from "./scriptListSubcomponents";
import {
  scriptListCssVar,
  scriptListLiveAttr,
  type ScriptListThemeVariant,
} from "./useScriptListThemeVars";

export type EditorScriptListPanelProps = {
  variant: ScriptListThemeVariant;
  className?: string;
  style?: CSSProperties;
  width?: number;
  scripts: WorkspaceScriptEntry[];
  autoexecuteScripts: WorkspaceScriptEntry[];
  bridgeConnected: boolean;
  executeIconColor: string;
  executeIconDisabledColor: string;
  bookmarkSet: Set<string>;
  onToggleBookmark: (id: string) => void;
  gistEntries?: V3GistEntry[];
  gistLoadingId?: string | null;
  gistRefreshing?: boolean;
  activeTabRemoteUrl?: string;
  onExecuteScript: (script: WorkspaceScriptEntry) => void;
  onOpenScript: (script: WorkspaceScriptEntry) => void;
  onRevealScript?: (script: WorkspaceScriptEntry) => void;
  onExecuteGist?: (gist: V3GistEntry) => void;
  onOpenGist?: (gist: V3GistEntry) => void;
  onOpenGistLink?: (gist: V3GistEntry) => void;
  onRemoveGist?: (gist: V3GistEntry) => void;
  onRequestAddGist?: () => void;
  onRefreshGist?: () => void;
  sectionIconSize?: number;
  rowIconSize?: number;
  rowActionIconSize?: number;
  trailingIconSize?: number;
};

export function EditorScriptListPanel({
  variant,
  className = "",
  style,
  width,
  scripts,
  autoexecuteScripts,
  bridgeConnected,
  executeIconColor,
  executeIconDisabledColor,
  bookmarkSet,
  onToggleBookmark,
  gistEntries = [],
  gistLoadingId = null,
  gistRefreshing = false,
  activeTabRemoteUrl,
  onExecuteScript,
  onOpenScript,
  onRevealScript,
  onExecuteGist,
  onOpenGist,
  onOpenGistLink,
  onRemoveGist,
  onRequestAddGist,
  onRefreshGist,
  sectionIconSize,
  rowIconSize,
  rowActionIconSize,
  trailingIconSize,
}: EditorScriptListPanelProps) {
  const layout = resolveScriptListLayout(variant);
  const panelWidth = width ?? SCRIPT_LIST_PANEL_WIDTH[variant];
  const sectionIconSizeResolved = sectionIconSize ?? layout.sectionIconSize;
  const rowIconSizeResolved = rowIconSize ?? layout.rowIconSize;
  const rowActionIconSizeResolved = rowActionIconSize ?? layout.rowActionIconSize;
  const trailingIconSizeResolved = trailingIconSize ?? layout.trailingIconSize;

  const [searchQuery, setSearchQuery] = useState("");
  const [isLocalFsOpen, setIsLocalFsOpen] = useState(true);
  const [isAutoexecuteOpen, setIsAutoexecuteOpen] = useState(true);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isGistsOpen, setIsGistsOpen] = useState(false);

  const query = searchQuery.toLowerCase().trim();
  const iconMuted = scriptListCssVar(variant, "sectionIcon");

  const filteredScripts = useMemo(
    () =>
      query
        ? scripts.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.fileName.toLowerCase().includes(query),
          )
        : scripts,
    [query, scripts],
  );

  const filteredAutoexecute = useMemo(
    () =>
      query
        ? autoexecuteScripts.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.fileName.toLowerCase().includes(query),
          )
        : autoexecuteScripts,
    [autoexecuteScripts, query],
  );

  const filteredBookmarks = useMemo(() => {
    const bookmarkedScripts = scripts.filter((s) => bookmarkSet.has(s.id));
    return query
      ? bookmarkedScripts.filter(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.fileName.toLowerCase().includes(query),
        )
      : bookmarkedScripts;
  }, [bookmarkSet, query, scripts]);

  const filteredBookmarkedGists = useMemo(() => {
    const bookmarkedGists = gistEntries.filter((g) => bookmarkSet.has(g.id));
    return query
      ? bookmarkedGists.filter(
          (g) =>
            g.title.toLowerCase().includes(query) ||
            g.rawUrl.toLowerCase().includes(query),
        )
      : bookmarkedGists;
  }, [bookmarkSet, gistEntries, query]);

  const hasBookmarkResults = filteredBookmarks.length > 0 || filteredBookmarkedGists.length > 0;

  const filteredGists = useMemo(
    () =>
      query
        ? gistEntries.filter(
            (g) =>
              g.title.toLowerCase().includes(query) ||
              g.rawUrl.toLowerCase().includes(query),
          )
        : gistEntries,
    [gistEntries, query],
  );

  const showGists = Boolean(onExecuteGist && onOpenGist && onRemoveGist);
  const addIconSize = Math.max(9, trailingIconSizeResolved - 1);

  return (
    <div
      className={`flex flex-col overflow-hidden min-w-0 w-full max-w-full box-border ${className}`.trim()}
      style={{ width: panelWidth, minWidth: panelWidth, maxWidth: panelWidth, ...style }}
    >
      <div
        className="rounded-[3px] flex items-center shrink-0 min-w-0 w-full box-border"
        style={{ height: layout.searchHeight, background: scriptListCssVar(variant, "searchBg") }}
        {...scriptListLiveAttr(variant, "searchBg")}
      >
        <div className="ml-1 flex shrink-0 items-center justify-center" style={{ width: layout.searchIconSize, height: layout.searchIconSize }}>
          <svg viewBox="0 0 24 24" width={layout.searchIconSize} height={layout.searchIconSize} fill="none">
            <path
              d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16 16l4.5 4.5"
              stroke={iconMuted}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent outline-none ml-1 w-full min-w-0 flex-1"
          style={{
            fontSize: layout.searchFontSize,
            fontFamily: "Inter, sans-serif",
            color: scriptListCssVar(variant, "searchPlaceholder"),
          }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="shrink-0" style={{ height: layout.gapAfterSearch }} />

      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-[1px]"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#444 transparent" }}
      >
        <SectionHeader
          variant={variant}
          layout={layout}
          label="Local Filesystem"
          isOpen={isLocalFsOpen}
          onToggle={() => setIsLocalFsOpen((p) => !p)}
          icon={<RowIcon name="hardDrive" size={sectionIconSizeResolved} color={iconMuted} />}
        />
        {isLocalFsOpen ? (
          <div className="shrink-0">
            {filteredScripts.length === 0 ? (
              <SectionEmpty variant={variant} layout={layout}>
                {query ? "No scripts match your search." : "No scripts found."}
              </SectionEmpty>
            ) : (
              filteredScripts.map((s) => (
                <ScriptRow
                  key={s.id}
                  variant={variant}
                  layout={layout}
                  script={s}
                  isBookmarked={bookmarkSet.has(s.id)}
                  bridgeConnected={bridgeConnected}
                  executeIconColor={executeIconColor}
                  executeIconDisabledColor={executeIconDisabledColor}
                  rowIconSize={rowIconSizeResolved}
                  rowActionIconSize={rowActionIconSizeResolved}
                  onExecute={() => onExecuteScript(s)}
                  onOpen={() => onOpenScript(s)}
                  onToggleBookmark={() => onToggleBookmark(s.id)}
                  onRevealInExplorer={
                    onRevealScript ? () => onRevealScript(s) : undefined
                  }
                />
              ))
            )}
          </div>
        ) : null}

        <SectionHeader
          variant={variant}
          layout={layout}
          label="Autoexecute"
          isOpen={isAutoexecuteOpen}
          onToggle={() => setIsAutoexecuteOpen((p) => !p)}
          icon={<RowIcon name="arrowSync" size={sectionIconSizeResolved} color={iconMuted} />}
        />
        {isAutoexecuteOpen ? (
          <div className="shrink-0">
            {filteredAutoexecute.length === 0 ? (
              <SectionEmpty variant={variant} layout={layout}>
                {query
                  ? "No autoexecute scripts match your search."
                  : "No autoexecute scripts yet. Toggle auto-execute on a tab to add one."}
              </SectionEmpty>
            ) : (
              filteredAutoexecute.map((s) => (
                <ScriptRow
                  key={s.id}
                  variant={variant}
                  layout={layout}
                  script={s}
                  isBookmarked={false}
                  bridgeConnected={bridgeConnected}
                  executeIconColor={executeIconColor}
                  executeIconDisabledColor={executeIconDisabledColor}
                  rowIconSize={rowIconSizeResolved}
                  rowActionIconSize={rowActionIconSizeResolved}
                  onExecute={() => onExecuteScript(s)}
                  onOpen={() => onOpenScript(s)}
                  onToggleBookmark={() => {}}
                  showBookmark={false}
                  onRevealInExplorer={
                    onRevealScript ? () => onRevealScript(s) : undefined
                  }
                />
              ))
            )}
          </div>
        ) : null}

        <SectionHeader
          variant={variant}
          layout={layout}
          label="Bookmarks"
          isOpen={isBookmarksOpen}
          onToggle={() => setIsBookmarksOpen((p) => !p)}
          icon={<RowIcon name="bookmark" size={sectionIconSizeResolved} color={iconMuted} />}
        />
        {isBookmarksOpen ? (
          <div className="shrink-0">
            {!hasBookmarkResults ? (
              <SectionEmpty variant={variant} layout={layout}>
                {query
                  ? "No bookmarks match your search."
                  : "No bookmarks yet. Hover a script or gist and click the bookmark icon."}
              </SectionEmpty>
            ) : (
              <>
                {filteredBookmarks.map((s) => (
                  <ScriptRow
                    key={s.id}
                    variant={variant}
                    layout={layout}
                    script={s}
                    isBookmarked
                    bridgeConnected={bridgeConnected}
                    executeIconColor={executeIconColor}
                    executeIconDisabledColor={executeIconDisabledColor}
                    rowIconSize={rowIconSizeResolved}
                    rowActionIconSize={rowActionIconSizeResolved}
                    onExecute={() => onExecuteScript(s)}
                    onOpen={() => onOpenScript(s)}
                    onToggleBookmark={() => onToggleBookmark(s.id)}
                    onRevealInExplorer={
                      onRevealScript ? () => onRevealScript(s) : undefined
                    }
                  />
                ))}
                {showGists
                  ? filteredBookmarkedGists.map((g) => (
                      <GistRow
                        key={g.id}
                        variant={variant}
                        layout={layout}
                        gist={g}
                        isBookmarked
                        bridgeConnected={bridgeConnected}
                        executeIconColor={executeIconColor}
                        executeIconDisabledColor={executeIconDisabledColor}
                        rowIconSize={rowIconSizeResolved}
                        rowActionIconSize={rowActionIconSizeResolved}
                        loading={gistLoadingId === g.id}
                        onExecute={() => onExecuteGist!(g)}
                        onOpen={() => onOpenGist!(g)}
                        onToggleBookmark={() => onToggleBookmark(g.id)}
                        onOpenGistLink={
                          onOpenGistLink ? () => onOpenGistLink(g) : undefined
                        }
                        onRemove={() => onRemoveGist!(g)}
                      />
                    ))
                  : null}
              </>
            )}
          </div>
        ) : null}

        {showGists ? (
          <>
            <SectionHeader
              variant={variant}
              layout={layout}
              label={variant === "shell" ? "Gists" : "Github Gists"}
              isOpen={isGistsOpen}
              onToggle={() => setIsGistsOpen((p) => !p)}
              icon={
                <RowIcon
                  name="github"
                  size={variant === "shell" ? Math.max(8, sectionIconSizeResolved - 1) : sectionIconSizeResolved}
                  color={iconMuted}
                />
              }
              trailing={
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {onRequestAddGist ? (
                    <button
                      type="button"
                      className="hover:opacity-70 flex shrink-0 items-center justify-center"
                      style={{ width: addIconSize + 2, height: addIconSize + 2 }}
                      title="Add gist URL"
                      onClick={onRequestAddGist}
                    >
                      <svg viewBox="0 0 11 12" width={addIconSize} height={addIconSize + 1} fill="none">
                        <path d="M5.5 11.5V0.5M0.5 6L10.5 6" stroke={iconMuted} strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : null}
                  {onRefreshGist ? (
                    <button
                      type="button"
                      className={`hover:opacity-70 flex shrink-0 items-center justify-center overflow-hidden ${gistRefreshing ? "opacity-50" : ""}`}
                      style={{ width: trailingIconSizeResolved + 2, height: trailingIconSizeResolved + 2 }}
                      title={
                        activeTabRemoteUrl
                          ? "Refresh active gist from URL"
                          : "Refresh active gist (open a gist tab first)"
                      }
                      disabled={gistRefreshing}
                      onClick={onRefreshGist}
                    >
                      <RowIcon name="refresh" size={trailingIconSizeResolved} color={iconMuted} />
                    </button>
                  ) : null}
                </div>
              }
            />
            {isGistsOpen ? (
              <div className="shrink-0">
                {filteredGists.length === 0 ? (
                  <SectionEmpty variant={variant} layout={layout}>
                    {query ? "No gists match your search." : "No gists yet. Click + and paste a raw .lua URL."}
                  </SectionEmpty>
                ) : (
                  filteredGists.map((g) => (
                    <GistRow
                      key={g.id}
                      variant={variant}
                      layout={layout}
                      gist={g}
                      isBookmarked={bookmarkSet.has(g.id)}
                      bridgeConnected={bridgeConnected}
                      executeIconColor={executeIconColor}
                      executeIconDisabledColor={executeIconDisabledColor}
                      rowIconSize={rowIconSizeResolved}
                      rowActionIconSize={rowActionIconSizeResolved}
                      loading={gistLoadingId === g.id}
                      onExecute={() => onExecuteGist!(g)}
                      onOpen={() => onOpenGist!(g)}
                      onToggleBookmark={() => onToggleBookmark(g.id)}
                      onOpenGistLink={
                        onOpenGistLink ? () => onOpenGistLink(g) : undefined
                      }
                      onRemove={() => onRemoveGist!(g)}
                    />
                  ))
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

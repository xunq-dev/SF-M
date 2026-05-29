import { ScriptHubCardThumb } from "@/app/scriptHub/ScriptHubCardThumb";
import type { ScriptBloxScript } from "@/app/scriptHub/scriptBloxApi";
import { scriptBloxCardImageUrl } from "@/app/scriptHub/scriptBloxApi";
import type { SynapseLegacyScript } from "@/app/scriptHub/synapseLegacyScripts";

type V3ScriptHubCardBaseProps = {
  bridgeConnected: boolean;
  executing: boolean;
  opening: boolean;
  onExecute: () => void;
  onOpenInEditor: () => void;
};

export type V3ScriptHubCardProps = V3ScriptHubCardBaseProps &
  (
    | {
        source: "scriptblox";
        script: ScriptBloxScript;
        onViewOnScriptBlox: () => void;
      }
    | {
        source: "synapse";
        script: SynapseLegacyScript;
      }
  );

export function V3ScriptHubCard(props: V3ScriptHubCardProps) {
  const { bridgeConnected, executing, opening, onExecute, onOpenInEditor } = props;
  const busy = executing || opening;

  const thumbSrc =
    props.source === "scriptblox"
      ? scriptBloxCardImageUrl(props.script)
      : props.script.thumb;

  const title = props.source === "scriptblox" ? props.script.title : props.script.name;
  const subtitle =
    props.source === "scriptblox"
      ? props.script.game?.name?.trim() || "Universal Script"
      : props.script.desc;

  const tooltip = `${title} — ${subtitle}`;

  return (
    <article
      className="relative aspect-[4/3] w-full overflow-hidden"
      style={{
        borderRadius: "var(--v3-shell-corner-radius, 7px)",
        boxShadow: "var(--v3-scripthub-card-shadow, 0px 2px 8px rgba(0,0,0,0.25))",
      }}
    >
      <div className="absolute inset-0 z-0">
        <ScriptHubCardThumb
          src={thumbSrc}
          fallbackBg="var(--v3-script-section-bg, #303030)"
          className="!absolute !inset-0 !h-full !w-full"
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%]"
        style={{
          background: `linear-gradient(to top, var(--v3-scripthub-card-scrim, rgba(0,0,0,0.55)), transparent)`,
        }}
        aria-hidden
      />

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 border-t border-solid px-2 py-1.5 backdrop-blur-md"
        style={{
          background: "var(--v3-scripthub-card-glass-bg, rgba(30,30,30,0.15))",
          borderColor: "var(--v3-scripthub-card-glass-border, rgba(255,255,255,0.1))",
          borderBottomLeftRadius: "var(--v3-shell-corner-radius, 7px)",
          borderBottomRightRadius: "var(--v3-shell-corner-radius, 7px)",
        }}
        data-v3-live="scriptHub.cardGlassBg"
      >
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "var(--v3-scripthub-card-glass-border, rgba(255,255,255,0.1))" }}
          data-v3-live="scriptHub.cardGlassBorder"
          aria-hidden
        />
        <p
          className="truncate text-[12px] font-semibold leading-tight drop-shadow-sm"
          style={{
            color: "var(--v3-scripthub-card-title, #f6f6f5)",
            fontFamily: "Inter, sans-serif",
          }}
          title={tooltip}
        >
          <span>{title}</span>
          <span
            className="font-normal"
            style={{ color: "var(--v3-scripthub-card-subtitle, #b0b0b0)" }}
          >
            {" · "}
            {subtitle}
          </span>
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!bridgeConnected || busy}
            title={
              bridgeConnected
                ? "Execute in executor"
                : "Not attached — run the bridge script in your executor"
            }
            onClick={onExecute}
            className="min-w-0 flex-1 rounded py-1 text-[10px] font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            data-v3-live="scriptHub.cardExecuteBg"
            style={{
              fontFamily: "Inter, sans-serif",
              background: bridgeConnected
                ? "var(--v3-scripthub-card-execute-bg, rgba(255,255,255,0.12))"
                : "var(--v3-scripthub-card-execute-disabled-bg, rgba(0,0,0,0.25))",
              color: bridgeConnected
                ? "var(--v3-actionbar-btn-text, #f6f6f5)"
                : "var(--v3-actionbar-btn-disabled-text, #8e8e8e)",
            }}
          >
            {executing ? "Running…" : "Execute"}
          </button>
          <button
            type="button"
            disabled={busy}
            title="Open in editor"
            onClick={onOpenInEditor}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              background: "var(--v3-scripthub-card-icon-btn-bg, rgba(255,255,255,0.08))",
              color: "var(--v3-actionbar-btn-icon, #ffffff)",
            }}
            aria-label="Open in editor"
          >
            <svg viewBox="0 0 12 12" width={11} height={11} fill="none" aria-hidden>
              <path
                d="M2 10L10 2M10 2H4.5M10 2V7.5"
                stroke="currentColor"
                strokeWidth={1.1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {props.source === "scriptblox" && (
            <button
              type="button"
              title="View on ScriptBlox"
              onClick={props.onViewOnScriptBlox}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-90"
              style={{
                background: "var(--v3-scripthub-card-icon-btn-bg, rgba(255,255,255,0.08))",
                color: "var(--v3-icon-muted, #c8c8c8)",
              }}
              aria-label="View on ScriptBlox"
            >
              <svg viewBox="0 0 12 12" width={11} height={11} fill="none" aria-hidden>
                <path
                  d="M4.5 2H2v8h8V7.5M7 2h3v3M10 2L5.5 6.5"
                  stroke="currentColor"
                  strokeWidth={1.1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

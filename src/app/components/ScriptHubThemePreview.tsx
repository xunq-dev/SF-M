import type { CSSProperties } from "react";
import { Search } from "lucide-react";
import type { ScriptHubThemeState } from "@/ui/shellTheme";

/** Short labels only — avoids importing the full legacy catalog (large Script Dumper) into the Themes chunk. */
const PREVIEW_LEGACY: readonly { name: string; desc: string }[] = [
  { name: "Dark Dex", desc: "Universal Explorer" },
  { name: "Unnamed ESP", desc: "Global ESP Framework" },
];

type ScriptHubThemePreviewProps = {
  scriptHubTheme: ScriptHubThemeState;
  /** Route column background (General colours → Page area). */
  pageAreaBg: string;
  /** Editor bar style (Execute / Clear / …) for ScriptBlox Page, Back, pagination. */
  editorNavButtonStyle: CSSProperties;
};

/**
 * Non-interactive mock of Script Hub main view + ScriptBlox strip; updates with theme controls.
 */
export default function ScriptHubThemePreview({
  scriptHubTheme: sh,
  pageAreaBg,
  editorNavButtonStyle,
}: ScriptHubThemePreviewProps) {
  return (
    <div
      className="pointer-events-none w-full max-w-[min(100%,320px)] select-none rounded-sm border border-[#464646] shadow-[2px_2px_0_rgba(0,0,0,0.2)]"
      aria-hidden
    >
      <div
        className="shell-script-browser-scroll max-h-[min(420px,55vh)] overflow-y-auto overflow-x-hidden p-2"
        style={{ backgroundColor: pageAreaBg }}
      >
        <div className="mb-0.5 flex items-start justify-between gap-1">
          <p className="min-w-0 flex-1 text-[12px] font-normal leading-tight" style={{ color: sh.titleColor }}>
            Scripts - Main Page
          </p>
          <div
            className="flex h-5 min-w-[68px] shrink-0 items-center justify-center border px-1 text-[7px] font-normal leading-none"
            style={editorNavButtonStyle}
          >
            ScriptBlox Page
          </div>
        </div>
        <p className="mb-2 text-[9px] leading-snug" style={{ color: sh.subtitleColor }}>
          Synapse legacy scripts — open in the editor to run or edit.
        </p>

        <div className="mb-2 grid min-w-0 grid-cols-2 gap-1.5">
          {PREVIEW_LEGACY.map((s) => (
            <div
              key={s.name}
              className="flex min-h-[4.5rem] min-w-0 overflow-hidden border shadow-[0px_1px_4px_rgba(0,0,0,0.2)]"
              style={{
                borderRadius: sh.cardRadiusPx,
                borderColor: sh.cardBorderColor,
                backgroundColor: sh.cardBackground,
              }}
            >
              <div
                className="h-[4.5rem] w-[34%] min-w-[40px] shrink-0"
                style={{ backgroundColor: sh.thumbFallbackBg }}
              />
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-0.5 p-1">
                <div className="min-w-0 flex-1">
                  <p
                    className="line-clamp-2 break-words text-[9px] font-semibold leading-tight [overflow-wrap:anywhere]"
                    style={{ color: sh.titleColor }}
                  >
                    {s.name}
                  </p>
                  <p
                    className="line-clamp-2 break-words text-[7px] leading-snug [overflow-wrap:anywhere]"
                    style={{ color: sh.subtitleColor }}
                  >
                    {s.desc}
                  </p>
                </div>
                <div
                  className="rounded border px-0.5 py-0.5 text-center text-[6px] font-semibold uppercase tracking-wide text-white"
                  style={{
                    borderColor: sh.ctaBorder,
                    backgroundColor: sh.ctaBackground,
                  }}
                >
                  Open in editor
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="border-t pt-2"
          style={{ borderColor: `${sh.cardBorderColor}80` }}
        >
          <p className="mb-1 text-[8px] font-medium uppercase tracking-wide" style={{ color: sh.subtitleColor }}>
            ScriptBlox (sample)
          </p>
          <div className="relative mb-1.5">
            <Search
              className="pointer-events-none absolute left-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-80"
              style={{ color: sh.subtitleColor }}
            />
            <div
              className="rounded py-1 pl-6 pr-1.5 text-[8px] text-white/90"
              style={{
                backgroundColor: sh.searchBackground,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: sh.searchBorder,
              }}
            >
              Search scripts…
            </div>
          </div>

          <div
            className="flex min-h-[3.25rem] min-w-0 overflow-hidden border shadow-[0px_1px_4px_rgba(0,0,0,0.2)]"
            style={{
              borderRadius: sh.cardRadiusPx,
              borderColor: sh.cardBorderColor,
              backgroundColor: sh.cardBackground,
            }}
          >
            <div
              className="h-[3.25rem] w-[32%] shrink-0"
              style={{ backgroundColor: sh.thumbFallbackBg }}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-0.5 p-1">
              <div className="min-w-0 flex-1">
                <p
                  className="line-clamp-2 break-words text-[8px] font-semibold leading-tight [overflow-wrap:anywhere]"
                  style={{ color: sh.titleColor }}
                >
                  Sample script title
                </p>
                <p
                  className="line-clamp-2 break-words text-[6px] font-medium uppercase leading-snug tracking-wide [overflow-wrap:anywhere]"
                  style={{ color: sh.subtitleColor }}
                >
                  Global Script
                </p>
              </div>
              <div
                className="rounded border px-0.5 py-0.5 text-center text-[6px] font-semibold uppercase text-white"
                style={{
                  borderColor: sh.ctaBorder,
                  backgroundColor: sh.ctaBackground,
                }}
              >
                Get script
              </div>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
            <div
              className="rounded border px-1.5 py-0.5 text-[6px] leading-none"
              style={editorNavButtonStyle}
            >
              Previous
            </div>
            <span className="text-[6px] font-semibold" style={{ color: sh.subtitleColor }}>
              Page 1
            </span>
            <div
              className="rounded border px-1.5 py-0.5 text-[6px] leading-none"
              style={editorNavButtonStyle}
            >
              Next
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

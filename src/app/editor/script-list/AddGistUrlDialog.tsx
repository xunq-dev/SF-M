import { useEffect, useState } from "react";
import { useOgTheme } from "@/app/synapse-original/ogTheme";
import { useSynapseXTheme } from "@/app/synapse-x/synapseXTheme";
import { V3FluentIcon } from "@/app/synapse-v3/components/V3FluentIcon";
import { isValidRawGistUrl } from "@/app/synapse-v3/v3Gists";
import {
  readShellTheme,
  SHELL_THEME_CHANGED_EVENT,
  type ConfirmationDialogThemeState,
} from "@/ui/shellTheme";

export type AddGistUrlDialogVariant = "shell" | "og" | "sx";

type AddGistUrlDialogProps = {
  variant: AddGistUrlDialogVariant;
  value: string;
  onChange: (val: string) => void;
  onOk: () => void;
  onCancel: () => void;
};

function ShellGistDialog({
  ct,
  value,
  onChange,
  onOk,
  onCancel,
  canOk,
}: {
  ct: ConfirmationDialogThemeState;
  value: string;
  onChange: (val: string) => void;
  onOk: () => void;
  onCancel: () => void;
  canOk: boolean;
}) {
  const topBarGradient = `linear-gradient(to bottom, ${ct.topBarFrom}, ${ct.topBarTo})`;

  return (
    <div
      className="relative w-[420px] overflow-hidden border border-[#414342] shadow-2xl"
      style={{ backgroundColor: ct.panelBg, borderRadius: "7px" }}
    >
      <div className="relative h-[48px] w-full shrink-0">
        <div
          className="pointer-events-none absolute inset-0 shadow-[0px_8px_15.9px_0px_rgba(0,0,0,0.15)]"
          style={{ background: topBarGradient }}
        />
        <div className="relative z-[1] flex h-full items-center gap-2 px-4">
          <V3FluentIcon name="github24" size={20} color={ct.iconStroke} />
          <p className="text-[17px] font-normal" style={{ color: ct.titleColor }}>
            Add GitHub Gist
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        <p className="mb-3 text-[11px] font-normal leading-snug" style={{ color: ct.bodyColor }}>
          Paste a raw link — updates when you reopen or refresh.
        </p>
        <input
          type="url"
          className="mb-4 h-[34px] w-full rounded border border-[#606060] bg-[#2d2d2d] px-3 text-[13px] outline-none"
          style={{ color: ct.bodyColor }}
          placeholder="Place a URL to a raw .lua script here"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canOk) onOk();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-8 min-w-[77px] border px-3 text-[13px] font-normal shadow-[0px_4px_4px_0px_rgba(0,0,0,0.09)]"
            style={{
              borderColor: ct.noButtonBorder,
              color: ct.noButtonText,
              backgroundImage: `linear-gradient(to bottom, ${ct.noButtonFrom}, ${ct.noButtonTo})`,
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canOk}
            className="h-8 min-w-[50px] border px-3 text-[13px] font-normal shadow-[0px_4px_4px_0px_rgba(0,0,0,0.09)] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: ct.yesButtonBorder,
              color: ct.yesButtonText,
              backgroundImage: `linear-gradient(to bottom, ${ct.yesButtonFrom}, ${ct.yesButtonTo})`,
            }}
            onClick={canOk ? onOk : undefined}
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

function FlatGistDialog({
  panelBg,
  textColor,
  value,
  onChange,
  onOk,
  onCancel,
  canOk,
}: {
  panelBg: string;
  textColor: string;
  value: string;
  onChange: (val: string) => void;
  onOk: () => void;
  onCancel: () => void;
  canOk: boolean;
}) {
  return (
    <div
      className="w-[380px] overflow-hidden border border-[#3a3a3a] shadow-2xl"
      style={{ backgroundColor: panelBg }}
    >
      <div className="flex items-center gap-2 border-b border-[#3a3a3a] px-4 py-3">
        <V3FluentIcon name="github24" size={18} color={textColor} />
        <p className="text-[15px] font-normal" style={{ color: textColor }}>
          Add GitHub Gist
        </p>
      </div>
      <div className="px-4 py-3">
        <p className="mb-3 text-[11px] font-normal leading-snug opacity-90" style={{ color: textColor }}>
          Paste a raw link — updates when you reopen or refresh.
        </p>
        <input
          type="url"
          className="mb-4 h-[32px] w-full border border-[#484848] bg-[#2d2d2d] px-3 text-[12px] text-white outline-none"
          placeholder="Place a URL to a raw .lua script here"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canOk) onOk();
            if (e.key === "Escape") onCancel();
          }}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-8 min-w-[77px] border border-[#484848] bg-[#3c3c3c] px-3 text-[12px] text-white hover:bg-[#454545]"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canOk}
            className="h-8 min-w-[50px] border border-[#484848] bg-[#3c3c3c] px-3 text-[12px] text-white hover:bg-[#454545] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={canOk ? onOk : undefined}
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddGistUrlDialog({ variant, value, onChange, onOk, onCancel }: AddGistUrlDialogProps) {
  const canOk = isValidRawGistUrl(value);
  const ogTheme = useOgTheme();
  const sxTheme = useSynapseXTheme();
  const [shellTheme, setShellTheme] = useState(() => readShellTheme());

  useEffect(() => {
    if (variant !== "shell") return;
    const sync = () => setShellTheme(readShellTheme());
    window.addEventListener(SHELL_THEME_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SHELL_THEME_CHANGED_EVENT, sync);
  }, [variant]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {variant === "shell" ? (
        <ShellGistDialog
          ct={shellTheme.confirmationTheme}
          value={value}
          onChange={onChange}
          onOk={onOk}
          onCancel={onCancel}
          canOk={canOk}
        />
      ) : (
        <FlatGistDialog
          panelBg={variant === "og" ? ogTheme.panelBg : sxTheme.panelBg}
          textColor={variant === "og" ? ogTheme.text : sxTheme.text}
          value={value}
          onChange={onChange}
          onOk={onOk}
          onCancel={onCancel}
          canOk={canOk}
        />
      )}
    </div>
  );
}

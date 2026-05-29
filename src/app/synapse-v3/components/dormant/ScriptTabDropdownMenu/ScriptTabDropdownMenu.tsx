interface ScriptTabDropdownMenuProps {
  onRename: () => void;
  onDuplicate: () => void;
  onExecute: () => void;
  onCloseAllButThis: () => void;
  onTogglePin?: () => void;
  onToggleAutoExecute?: () => void;
  onSetIcon?: (icon: string) => void;
  showCustomize: boolean;
  setShowCustomize: (show: boolean) => void;
  showSetIcon: boolean;
  setShowSetIcon: (show: boolean) => void;
  isPinned?: boolean;
  isAutoExecute?: boolean;
  /** When true, "Execute" is rendered as a non-interactive, dimmed entry. */
  executeDisabled?: boolean;
}

function MenuTick({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <svg viewBox="0 0 12 12" width={10} height={10} fill="none" className="shrink-0">
      <path d="M2 6l3 3 5-5" stroke="#BDBDBC" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MenuRow({
  label,
  top,
  onClick,
  disabled,
  tick,
  title,
}: {
  label: string;
  top: number;
  onClick?: () => void;
  disabled?: boolean;
  tick?: boolean;
  title?: string;
}) {
  return (
    <p
      onClick={disabled ? undefined : onClick}
      title={title}
      className={`[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[16px] whitespace-nowrap transition-colors ${
        disabled
          ? "text-[#555] cursor-not-allowed"
          : "text-[#d4d4d4] cursor-pointer hover:text-white"
      }`}
      style={{ top }}
    >
      {label}
      {tick ? (
        <span className="inline-flex align-middle ml-[6px]">
          <MenuTick active />
        </span>
      ) : null}
    </p>
  );
}

export function ScriptTabDropdownMenu({
  onRename,
  onDuplicate,
  onExecute,
  onCloseAllButThis,
  onTogglePin,
  onToggleAutoExecute,
  onSetIcon,
  showCustomize,
  setShowCustomize,
  showSetIcon,
  setShowSetIcon,
  isPinned,
  isAutoExecute,
  executeDisabled,
}: ScriptTabDropdownMenuProps) {
  return (
    <div
      className="relative z-50 select-none bg-transparent pointer-events-none"
      data-name="Script tab dropdown menu"
      style={{ width: 528, height: 397 }}
    >
      <div
        className="absolute left-0 top-0 w-[199px] h-[168px] pointer-events-auto"
        data-name="Rightclickmenuscripttab"
        onMouseEnter={() => setShowSetIcon(false)}
      >
        <div className="absolute inset-0 bg-[rgba(30,30,30,0.2)] border border-[#808080] border-solid rounded-[6px] backdrop-blur-md shadow-2xl" />

        {/* Duplicate Icon */}
        <div className="absolute left-[12px] top-[12px] width-[13px] height-[13px]">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </div>

        {/* Execute Icon */}
        <div className="absolute left-[12px] top-[44px] width-[13px] height-[13px]">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={executeDisabled ? "#555" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>

        {/* Customize Icon */}
        <div className="absolute left-[12px] top-[76px] width-[13px] height-[13px]">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </div>

        {/* Toggle Auto Execute Icon */}
        <div className="absolute left-[12px] top-[108px] width-[13px] height-[13px]">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        </div>

        {/* Close All But This Icon */}
        <div className="absolute left-[12px] top-[140px] width-[13px] height-[13px]">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#BDBDBC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>

        <p onClick={onDuplicate} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[8px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Duplicate</p>
        <p
          onClick={executeDisabled ? undefined : onExecute}
          title={executeDisabled ? "Not attached — run the bridge script in your executor" : undefined}
          className={`[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[16px] top-[40px] whitespace-nowrap transition-colors ${
            executeDisabled
              ? "text-[#555] cursor-not-allowed"
              : "text-[#d4d4d4] cursor-pointer hover:text-white"
          }`}
        >Execute</p>

        <div
          onMouseEnter={() => setShowCustomize(true)}
          className="absolute left-[33px] top-[72px] w-[150px] h-[24px] flex items-center justify-between cursor-pointer group pr-[12px]"
        >
          <span className="font-['Inter',sans-serif] font-normal text-[#d4d4d4] text-[16px] group-hover:text-white transition-colors">Customize</span>
          <div className="w-[5.6px] h-[9.2px]" data-name="Customise arrow">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 5.6 9.2">
              <path d="M1 1L4.6 4.6L1 8.2" stroke="#B8B8B8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
        </div>

        <MenuRow label="Toggle auto-execute" top={104} onClick={onToggleAutoExecute} tick={isAutoExecute} />
        <p onClick={onCloseAllButThis} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[136px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Close all but this</p>
      </div>

      {showCustomize && (
        <div
          className="absolute left-[199px] top-[66px] w-[165px] h-[104px] pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-100"
          data-name="Customizedropdown"
          onMouseLeave={() => {
            if (!showSetIcon) setShowCustomize(false);
          }}
        >
          <div className="absolute inset-0 bg-[rgba(30,30,30,0.2)] border border-[#808080] border-solid rounded-[6px] backdrop-blur-md shadow-2xl" />

          <div className="absolute left-[12px] top-[12px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#CFCFCF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </div>
          <div className="absolute left-[12px] top-[44px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#CFCFCF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          </div>
          <div className="absolute left-[12px] top-[76px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#CFCFCF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>

          <p onClick={onRename} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[8px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Rename</p>
          <MenuRow label="Toggle pin" top={40} onClick={onTogglePin} tick={isPinned} />

          <div
            onMouseEnter={() => setShowSetIcon(true)}
            className="absolute left-[33px] top-[72px] w-[120px] h-[24px] flex items-center justify-between cursor-pointer group"
          >
            <span className="font-['Inter',sans-serif] font-normal text-[#d4d4d4] text-[16px] group-hover:text-white transition-colors">Set icon</span>
            <div className="w-[5.6px] h-[9.2px]" data-name="Seticon arrow">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 5.6 9.2">
                <path d="M1 1L4.6 4.6L1 8.2" stroke="#B8B8B8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {showCustomize && showSetIcon && (
        <div
          className="absolute left-[363px] top-[132px] w-[165px] h-[201px] pointer-events-auto animate-in fade-in slide-in-from-left-2 duration-100"
          data-name="Seticonmenu"
          onMouseLeave={() => setShowSetIcon(false)}
        >
          <div className="absolute inset-0 bg-[rgba(30,30,30,0.2)] border border-[#808080] border-solid rounded-[6px] backdrop-blur-md shadow-2xl" />

          <div className="absolute left-[12px] top-[12px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#D1D1D1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <div className="absolute left-[12px] top-[44px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#D9D9D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="absolute left-[12px] top-[76px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#D9D9D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4M15.09 14c.91-.81 1.41-1.84 1.41-3A4.5 4.5 0 0 0 12 6.5 4.5 4.5 0 0 0 7.5 11c0 1.16.5 2.19 1.41 3h6.18z" />
            </svg>
          </div>
          <div className="absolute left-[12px] top-[108px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#D9D9D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="absolute left-[12px] top-[140px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#DBDBDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </div>
          <div className="absolute left-[12px] top-[172px] width-[13px] height-[13px]">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#DBDBDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12M12 3v14M9 12h6M5 21h14M19 17l-5-8V3H10v6l-5 8c-1.3 2.2.3 5 2.8 5h8.4c2.5 0 4.1-2.8 2.8-5z" />
            </svg>
          </div>

          <p onClick={() => onSetIcon?.("none")} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[8px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">None</p>
          <p onClick={() => onSetIcon?.("star")} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[40px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Star</p>
          <p onClick={() => onSetIcon?.("lightbulb")} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[72px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Lightbulb</p>
          <p onClick={() => onSetIcon?.("turbo")} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[104px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Turbo</p>
          <p onClick={() => onSetIcon?.("commands")} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[136px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Commands</p>
          <p onClick={() => onSetIcon?.("beaker")} className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[33px] not-italic text-[#d4d4d4] text-[16px] top-[168px] whitespace-nowrap cursor-pointer hover:text-white transition-colors">Beaker</p>
        </div>
      )}
    </div>
  );
}

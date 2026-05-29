import { isValidRawGistUrl } from "../../../v3Gists";

interface AddGistUrlPopupProps {
  value: string;
  onChange: (val: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export function AddGistUrlPopup({ value, onChange, onOk, onCancel }: AddGistUrlPopupProps) {
  const canOk = isValidRawGistUrl(value);

  return (
    <div
      className="relative w-[384px] h-[203px] z-50 drop-shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      data-name="Add Gist URL Popup"
      data-v3-rename-popup-root
    >
      <div className="absolute bg-[#131312] border border-[#808080] border-solid h-[203px] left-0 rounded-[8px] top-0 w-[384px] shadow-2xl" />
      <div className="absolute bg-[#212120] border-[#808080] border-l border-r border-solid border-t h-[138px] left-0 rounded-tl-[8px] rounded-tr-[8px] top-0 w-[384px]" />
      <div className="absolute bg-[#2d2d2d] h-[37px] left-[10px] rounded-[6px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] top-[92px] w-[365px]" data-name="Textbox" />
      <input
        type="url"
        className="absolute h-[37px] left-[16px] top-[92px] w-[350px] bg-transparent outline-none text-white text-[14px]"
        placeholder="Place a URL to a raw .lua script here"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canOk) onOk();
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
      />

      <div
        onClick={canOk ? onOk : undefined}
        className={`absolute left-[240px] top-[154px] w-[50px] h-[32px] bg-[#373737] border border-[#3f3f3f] border-solid rounded-[4px] flex items-center justify-center select-none ${
          canOk ? "cursor-pointer hover:bg-[#4a4a4a]" : "cursor-not-allowed opacity-50"
        }`}
      >
        <p className="font-['Inter',sans-serif] font-normal leading-[normal] text-[#b3b3b3] text-[14px] pointer-events-none">Ok</p>
      </div>

      <div
        onClick={onCancel}
        className="absolute left-[298px] top-[154px] w-[77px] h-[32px] bg-[#373737] border border-[#3f3f3f] border-solid rounded-[4px] cursor-pointer hover:bg-[#4a4a4a] flex items-center justify-center select-none"
      >
        <p className="font-['Inter',sans-serif] font-normal leading-[normal] text-[#b3b3b3] text-[14px] pointer-events-none">Cancel</p>
      </div>

      <p className="absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[50px] not-italic text-[20px] text-white top-[17px] whitespace-nowrap">Add GitHub Gist</p>
      <p
        className="absolute left-[50px] right-[12px] top-[50px] font-['Inter',sans-serif] text-[11px] font-normal leading-snug text-[#b3b3b3]"
      >
        Paste a raw link — updates when you reopen or refresh.
      </p>

      <div className="absolute left-[10px] top-[14px] pointer-events-none" data-name="github icon">
        <svg viewBox="0 0 24 24" width={20} height={20} fill="white">
          <path d="M12 2C6.477 2 2 6.484 2 12.011c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.011C22 6.484 17.522 2 12 2z" />
        </svg>
      </div>
    </div>
  );
}

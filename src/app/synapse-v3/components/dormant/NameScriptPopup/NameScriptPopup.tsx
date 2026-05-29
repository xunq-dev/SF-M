import svgPaths from "../../../remake-assets/dormant-imports/RenameTabPopup/svg-ddjmdjxinv";
import { sanitizeAutoexecuteBaseName } from "../../../v3AutoExecute";

interface NameScriptPopupProps {
  value: string;
  onChange: (val: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export function NameScriptPopup({ value, onChange, onOk, onCancel }: NameScriptPopupProps) {
  const canOk = sanitizeAutoexecuteBaseName(value).length > 0;

  return (
    <div
      className="relative w-[384px] h-[203px] z-50 drop-shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      data-name="Name Script Popup"
      data-v3-rename-popup-root
    >
      <div className="absolute bg-[#131312] border border-[#808080] border-solid h-[203px] left-0 rounded-[8px] top-0 w-[384px] shadow-2xl" />
      <div className="absolute bg-[#212120] border-[#808080] border-l border-r border-solid border-t h-[138px] left-0 rounded-tl-[8px] rounded-tr-[8px] top-0 w-[384px]" />
      <div className="absolute bg-[#2d2d2d] h-[37px] left-[10px] rounded-[6px] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] top-[92px] w-[365px]" data-name="Textbox" />
      <input
        type="text"
        className="absolute h-[37px] left-[16px] top-[92px] w-[350px] bg-transparent outline-none text-white text-[14px]"
        placeholder="Script name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            onChange(`${value}-`);
            return;
          }
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

      <p className="absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[50px] not-italic text-[20px] text-white top-[17px] whitespace-nowrap">Name script</p>
      <p className="absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[50px] not-italic text-[16px] text-white top-[54px] whitespace-nowrap">Input the script name below.</p>

      <div className="absolute inset-[10.84%_90.36%_79.8%_4.95%] pointer-events-none" data-name="pencil icon">
        <div className="absolute inset-[-5.26%_-5.56%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 21">
            <g id="pencil icon">
              <path d={svgPaths.p14a2aa00} fill="white" />
              <path d={svgPaths.p1d9f9200} fill="white" />
              <path d={svgPaths.p14a2aa00} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d={svgPaths.p1d9f9200} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

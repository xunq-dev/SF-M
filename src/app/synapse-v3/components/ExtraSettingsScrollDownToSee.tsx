import { useState } from "react";

const svgPaths = {
  p3012900: "M12.5001 1.00002L5.50015 6.84696L1.00015 4.11839",
  p34b70a00: "M0 5.69807C0 2.55112 3.13401 0 7 0H895C898.866 0 902 2.55111 902 5.69807V331.302C902 334.449 898.866 337 895 337H6.99999C3.134 337 0 334.449 0 331.302V5.69807Z",
  p3d02dc00: "M5.5 9.07551V0.5M0.5 4.78776L10.5 4.78776",
  p5defe80: "M2.46875 7.07781V5.10446C2.46875 4.86228 2.72059 4.66594 3.03125 4.66594H6.96875C7.27941 4.66594 7.53125 4.86228 7.53125 5.10446V7.29707M7.53125 0.93852V1.81556C7.53125 2.25408 6.96875 2.25408L3.03125 2.25408C2.72059 2.25408 2.46875 2.05775 2.46875 1.81556L2.46875 0.5M9.21757 2.0339L7.53244 0.720184C7.3516 0.579204 7.10633 0.500001 6.85059 0.5H1.46429C0.931719 0.5 0.5 0.836565 0.5 1.25175V6.76458C0.5 7.17976 0.931719 7.51633 1.46429 7.51633H8.53571C9.06828 7.51633 9.5 7.17976 9.5 6.76458V2.56546C9.5 2.36609 9.3984 2.17488 9.21757 2.0339Z",
};

interface ExtraSettingsScrollDownToSeeProps {
  displayInfo: boolean;
  onDisplayInfoChange: (val: boolean) => void;
  defaultTabContent: string;
  onSaveDefaultTabContent: (val: string) => void;
}

export function ExtraSettingsScrollDownToSee({
  displayInfo,
  onDisplayInfoChange,
  defaultTabContent,
  onSaveDefaultTabContent,
}: ExtraSettingsScrollDownToSeeProps) {
  const [inputValue, setInputValue] = useState(defaultTabContent);

  return (
    <div className="relative w-[902px] h-[337px]" data-name="Extra settings. scroll down to see.">
      <div className="absolute h-[337px] left-0 top-0 w-[902px] pointer-events-none" data-name="Stuff to put in scrollbar in settings past contextual">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 902 337">
          <g filter="url(#filter0_i_1_131)" id="Stuff to put in scrollbar in settings past contextual">
            <path d={svgPaths.p34b70a00} fill="#151515" />
            <path d="M0 0H31V337H0V0Z" fill="#151515" />
            <path d="M871 0H902V24.4203H871V0Z" fill="#151515" />
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="344" id="filter0_i_1_131" width="907" x="-5" y="-7">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset dx="-5" dy="-7" />
              <feGaussianBlur stdDeviation="20.25" />
              <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.11 0" />
              <feBlend in2="shape" mode="normal" result="effect1_innerShadow_1_131" />
            </filter>
          </defs>
        </svg>
      </div>
      
      {/* Toggle checkbox */}
      <p className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[5px] not-italic text-[14px] text-white top-[113px] whitespace-nowrap">Display information area</p>
      <p className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[5px] not-italic text-[#6b6b6b] text-[13px] top-[131px] whitespace-nowrap">Whether the information area below the editor should be shown</p>
      
      {/* Unchecked state */}
      <div 
        onClick={() => onDisplayInfoChange(false)}
        className="absolute bg-[#212120] border border-[#7e7e7e] border-solid left-[856px] rounded-[3px] size-[30px] top-[117px] cursor-pointer transition-all flex items-center justify-center"
      >
        {!displayInfo && (
          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
        )}
      </div>

      {/* Checked state */}
      <div 
        onClick={() => onDisplayInfoChange(true)}
        className="absolute border border-[#7e7e7e] border-solid left-[817px] rounded-[3px] size-[30px] top-[117px] cursor-pointer flex items-center justify-center transition-all"
        style={{
          background: displayInfo ? "#b0d8e5" : "#212120",
        }}
      >
        {displayInfo && (
          <svg className="w-[14px] h-[8px]" fill="none" preserveAspectRatio="none" viewBox="0 0 13.5002 7.84697">
            <path d={svgPaths.p3012900} id="Icon" stroke="#0F2433" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        )}
      </div>
      
      {/* Default Tab Content */}
      <p className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[5px] not-italic text-[14px] text-white top-[10px] whitespace-nowrap">Default Tab Content</p>
      <p className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[5px] not-italic text-[#6b6b6b] text-[13px] top-[28px] whitespace-nowrap">What will be written to the contents of a new tab.</p>
      
      {/* Directories in sidebar */}
      <p className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[5px] not-italic text-[14px] text-white top-[59px] whitespace-nowrap">Directories in sidebar</p>
      <p className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal leading-[normal] left-[5px] not-italic text-[#6b6b6b] text-[13px] top-[77px] whitespace-nowrap">You can set extra directories to show up in the sidebar.</p>
      
      {/* Default Tab Content Input */}
      <div className="absolute bg-[#2d2d2d] h-[38px] left-[554px] rounded-[6px] top-[17px] w-[250px]" />
      <input 
        className="absolute font-['Inter',sans-serif] font-normal left-[565px] text-white text-[14px] top-[27px] bg-transparent outline-none w-[230px]" 
        value={inputValue} 
        onChange={(e) => setInputValue(e.target.value)}
      />
      
      {/* Save Button */}
      <div 
        onClick={() => onSaveDefaultTabContent(inputValue)}
        className="absolute bg-[#262626] h-[38px] left-[808px] rounded-[4px] top-[17px] w-[83px] cursor-pointer hover:bg-[#333] select-none flex items-center justify-center gap-2"
      >
        <p className="font-['Inter',sans-serif] font-normal leading-[normal] text-[#7d7d7c] hover:text-white text-[14px] whitespace-nowrap">Save</p>
        <div className="w-[10px] h-[8px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 8.01633">
            <path d={svgPaths.p5defe80} id="Icon" stroke="#8B8B8A" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      
      {/* Directories Sidebar trigger */}
      <div className="absolute bg-black border border-[#262626] border-solid h-[28px] left-[507px] rounded-tl-[7px] rounded-tr-[7px] top-[67px] w-[384px] cursor-not-allowed flex items-center px-3 justify-between">
        <span className="text-[#6b6b6b] text-[12px]">H:\project\editor-sidebar-scripts</span>
      </div>
      <div className="absolute flex inset-[13.44%_2.55%_85.07%_96.34%] items-center justify-center pointer-events-none" style={{ containerType: "size" }}>
        <div className="-rotate-180 -scale-x-100 flex-none h-[100cqh] w-[100cqw]">
          <div className="relative size-full" data-name="Add Tab">
            <div className="absolute inset-[-5.83%_-5%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11 9.57551">
                <path d={svgPaths.p3d02dc00} id="Add Tab" stroke="white" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="[word-break:break-word] absolute font-['Inter',sans-serif] font-normal h-[7px] leading-[normal] left-[844px] not-italic text-[24px] text-[#6b6b6b] top-[58px] w-[11px] pointer-events-none">_</p>
    </div>
  );
}

import { readOgTheme } from "@/app/synapse-original/ogTheme";
import { readShellTheme } from "@/ui/shellTheme";

export default function SynapseOriginalMainPreview() {
  const theme = readShellTheme();
  const og = readOgTheme();
  
  return (
    <div 
      className="relative w-full aspect-[838/372] overflow-hidden border border-[#3a3a3a]"
      style={{ backgroundColor: og.windowBg }}
    >
      {/* Top Bar */}
      <div 
        className="absolute top-0 left-0 w-full h-[58px]"
        style={{ backgroundColor: og.panelBg }}
      >
        <div className="absolute left-[14px] top-[14px] w-[140px] h-[30px] bg-[#444] opacity-20 rounded-sm" />
        <div className="absolute right-[14px] top-[14px] flex gap-2">
          <div className="w-[20px] h-[20px] border border-[#555]" />
          <div className="w-[20px] h-[20px] border border-[#555]" />
        </div>
      </div>
      
      {/* Sidebar */}
      <div 
        className="absolute right-[12px] top-[69px] w-[139px] bottom-[10px] border border-[#313131]"
        style={{ backgroundColor: og.panelBg }}
      >
        <div className="p-2 space-y-1">
          <div className="h-[14px] w-[80%] bg-[#444] opacity-30" />
          <div className="h-[14px] w-[60%] bg-[#444] opacity-30" />
          <div className="h-[14px] w-[70%] bg-[#444] opacity-30" />
        </div>
      </div>
      
      {/* Editor */}
      <div 
        className="absolute left-[8px] top-[87px] right-[158px] bottom-[61px] border border-[#313131]"
        style={{ backgroundColor: og.editorBg }}
      >
        <div className="p-4 font-mono text-[10px] space-y-2 opacity-40">
          <div className="flex gap-2">
            <span style={{ color: og.text }}>function</span>
            <span style={{ color: og.iconColor }}>hello_world</span>
            <span style={{ color: og.text }}>()</span>
          </div>
          <div className="pl-4 flex gap-2">
            <span style={{ color: og.iconColor }}>print</span>
            <span style={{ color: og.text }}>("Hello from Synapse Original!")</span>
          </div>
          <div style={{ color: og.text }}>end</div>
        </div>
      </div>
      
      {/* Buttons */}
      <div className="absolute left-[9px] right-[12px] bottom-[10px] h-[39px] flex gap-[5px]">
        {[1, 1, 1, 1, 1.2, 1.5].map((flex, i) => (
          <div 
            key={i}
            className="h-full border border-[#313131] flex items-center justify-center text-[8px] uppercase tracking-wider"
            style={{ 
              flex: `${flex} 1 0`,
              backgroundColor: og.buttonBg,
              color: og.buttonText,
              borderColor: og.buttonBorder
            }}
          >
            Btn
          </div>
        ))}
      </div>
      
      {/* Tab Strip */}
      <div className="absolute left-[8px] top-[70px] right-[158px] h-[16px] flex gap-1">
        <div 
          className="h-full px-4 border border-b-0 flex items-center text-[8px]"
          style={{ 
            backgroundColor: og.tabActiveBg, 
            borderColor: og.tabActiveBorder,
            color: og.tabText 
          }}
        >
          script.lua
        </div>
        <div 
          className="h-full px-4 border border-b-0 flex items-center text-[8px] opacity-60"
          style={{ 
            backgroundColor: og.tabBg, 
            borderColor: og.tabBorder,
            color: og.tabText 
          }}
        >
          untitled.lua
        </div>
      </div>
    </div>
  );
}

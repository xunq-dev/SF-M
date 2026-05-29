import { useSynapseXTheme } from "@/app/synapse-x/synapseXTheme";

export default function SynapseXMainPreview() {
  const sx = useSynapseXTheme();
  
  return (
    <div 
      className="relative w-full aspect-[528/460] overflow-hidden border border-[#1a1a1a]"
      style={{ backgroundColor: sx.windowBg }}
    >
      {/* Top Bar (SynapseXChrome logic) */}
      <div 
        className="absolute top-0 left-0 w-full h-[22px] border-b flex items-center px-2"
        style={{ backgroundColor: sx.panelBg, borderColor: sx.tabBorder }}
      >
        <div className="text-[9px] font-bold" style={{ color: sx.text }}>Synapse X</div>
        <div className="ml-auto flex gap-1">
          <div className="w-[12px] h-[12px] bg-[#444] opacity-30" />
          <div className="w-[12px] h-[12px] bg-[#444] opacity-30" />
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="absolute top-[22px] left-0 right-0 bottom-0 p-2 flex flex-col gap-[7px]">
        
        <div className="flex flex-1 gap-[7px] min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tab Strip */}
            <div className="h-[16px] flex gap-1 mb-[1px]">
              <div 
                className="h-full px-4 border border-b-0 flex items-center text-[8px]"
                style={{ 
                  backgroundColor: sx.tabActiveBg, 
                  borderColor: sx.tabActiveBorder,
                  color: sx.tabText 
                }}
              >
                script.lua
              </div>
              <div 
                className="h-full px-4 border border-b-0 flex items-center text-[8px] opacity-60"
                style={{ 
                  backgroundColor: sx.tabBg, 
                  borderColor: sx.tabBorder,
                  color: sx.tabText 
                }}
              >
                untitled.lua
              </div>
            </div>
            
            {/* Editor */}
            <div 
              className="flex-1 border"
              style={{ backgroundColor: sx.editorBg, borderColor: sx.tabBorder }}
            >
              <div className="p-3 font-mono text-[9px] space-y-1.5 opacity-40">
                <div className="flex gap-1.5">
                  <span style={{ color: sx.text }}>function</span>
                  <span style={{ color: sx.iconColor }}>x_is_cool</span>
                  <span style={{ color: sx.text }}>()</span>
                </div>
                <div className="pl-3 flex gap-1.5">
                  <span style={{ color: sx.iconColor }}>print</span>
                  <span style={{ color: sx.text }}>("Synapse X!")</span>
                </div>
                <div style={{ color: sx.text }}>end</div>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div 
            className="w-[139px] h-full border"
            style={{ backgroundColor: sx.panelBg, borderColor: sx.tabBorder }}
          >
            <div className="p-1 space-y-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-[12px] w-full bg-[#444] opacity-20" />
              ))}
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="h-[33px] flex gap-1.5">
          {["Execute", "Clear", "Open File", "Execute File", "Save File", "Attach"].map((label, i) => (
            <div 
              key={i}
              className="h-full border flex items-center justify-center text-[8px] px-1"
              style={{ 
                flex: 1,
                backgroundColor: sx.buttonBg,
                color: sx.buttonText,
                borderColor: sx.buttonBorder
              }}
            >
              {label}
            </div>
          ))}
        </div>
        
        {/* Bottom row */}
        <div className="h-[33px] flex gap-1.5">
          <div 
            className="flex-[1.5] h-full border flex items-center justify-center text-[8px]"
            style={{ backgroundColor: sx.buttonBg, color: sx.buttonText, borderColor: sx.buttonBorder }}
          >
            Script Hub
          </div>
          <div 
            className="flex-[2] h-full border flex items-center justify-center text-[8px]"
            style={{ backgroundColor: sx.buttonBg, color: sx.buttonText, borderColor: sx.buttonBorder }}
          >
            Options
          </div>
        </div>
      </div>
    </div>
  );
}

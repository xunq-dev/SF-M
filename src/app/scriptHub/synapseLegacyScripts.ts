import dexThumb from "@/assets/script-hub/dex.png?url";
import remoteSpyThumb from "@/assets/script-hub/RemoteSpy.png?url";
import scriptDumpThumb from "@/assets/script-hub/scriptdump.png?url";
import unnamedEspThumb from "@/assets/script-hub/unnamedesp.png?url";
import scriptDumperCode from "./data/scriptDumperLegacy.lua?raw";

export interface SynapseLegacyScript {
  name: string;
  desc: string;
  code: string;
  thumb: string;
}

export const synapseLegacyScripts: SynapseLegacyScript[] = [
  {
    name: "Dark Dex",
    desc: "Universal Explorer",
    thumb: dexThumb,
    code: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/Babyhamsta/RBLX_Scripts/main/Universal/BypassedDarkDexV3.lua", true))()',
  },
  {
    name: "Unnamed ESP",
    desc: "Global ESP Framework",
    thumb: unnamedEspThumb,
    code: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/ic3w0lf22/Unnamed-ESP/master/UnnamedESP.lua"))()',
  },
  {
    name: "Remote Spy",
    desc: "SimpleSpy V3",
    thumb: remoteSpyThumb,
    code: 'loadstring(game:HttpGet("https://raw.githubusercontent.com/exxtremestuffs/SimpleSpySource/master/SimpleSpy.lua"))()',
  },
  {
    name: "Script Dumper",
    desc: "Decompile & dump all scripts",
    thumb: scriptDumpThumb,
    code: scriptDumperCode,
  },
];

/**
 * Completion data mirrored from Synapse X `MainWindow.xaml.cs` → `Browser_MonacoReady()`
 * (keyword loops + every `Browser.AddIntellisense` call). Insert strings match source, including typos.
 */
/** Stored numeric kinds until `registerSynapseLuaCompletion` maps to `monaco.languages.CompletionItemKind` */
const KW = 17; // Keyword
const MTH = 0; // Method
const CLS = 5; // Class

export type SynapseCompletionDef = {
  label: string;
  kind: typeof KW | typeof MTH | typeof CLS;
  documentation: string;
  insertText: string;
};

function syn(
  label: string,
  type: "Keyword" | "Method" | "Class",
  documentation: string,
  insertText: string,
): SynapseCompletionDef {
  const kind = type === "Keyword" ? KW : type === "Class" ? CLS : MTH;
  return { label, kind, documentation, insertText };
}

const keywordsControlFlow = [
  "and",
  "do",
  "elseif",
  "for",
  "function",
  "if",
  "in",
  "local",
  "not",
  "or",
  "then",
  "until",
  "while",
] as const;

const keywordsValue = [
  "_G",
  "shared",
  "true",
  "false",
  "nil",
  "end",
  "break",
  "else",
  "repeat",
  "then",
  "return",
] as const;

const intellisenseNoDocs = [
  "error",
  "getfenv",
  "getmetatable",
  "newproxy",
  "next",
  "pairs",
  "pcall",
  "print",
  "rawequal",
  "rawget",
  "rawset",
  "select",
  "setfenv",
  "tonumber",
  "tostring",
  "type",
  "unpack",
  "xpcall",
  "_G",
  "shared",
  "delay",
  "require",
  "spawn",
  "tick",
  "typeof",
  "wait",
  "warn",
  "game",
  "Enum",
  "script",
  "workspace",
] as const;

const explicit: SynapseCompletionDef[] = [
  syn(
    "hookfunction(<function> old, <function> hook)",
    "Method",
    "Hooks function 'old', replacing it with the function 'hook'. The old function is returned, you must use it to call the function further.",
    "hookfunction",
  ),
  syn("getgenv(<void>)", "Method", "Returns the environment that will be applied to each script ran by Synapse.", "getgenv"),
  syn("keyrelease(<int> key)", "Method", "Releases 'key' on the keyboard. You can access the int key values on MSDN.", "keyrelease"),
  syn("setclipboard(<string> value)", "Method", "Sets 'value' to the clipboard.", "setclipboard"),
  syn("mouse2press(<void>)", "Method", "Clicks down on the right mouse button.", "mouse2press"),
  syn(
    "getsenv(<LocalScript, ModuleScript> Script)",
    "Method",
    "Returns the environment of Script. Returns nil if the script is not running.",
    "getsenv",
  ),
  syn("checkcaller(<void>)", "Method", "Returns true if the current thread was made by Synapse. Useful for metatable hooks.", "checkcaller"),
  syn("bit", "Class", "Bit Library", "bit"),
  syn("bit.bdiv(<uint> dividend, <uint> divisor)", "Method", "Divides 'dividend' by 'divisor', remainder is not returned.", "bit.bdiv"),
  syn("bit.badd(<uint> a, <uint> b)", "Method", "Adds 'a' with 'b', allows overflows (unlike normal Lua).", "bit.badd"),
  syn("bit.bsub(<uint> a, <uint> b)", "Method", "Subtracts 'a' with 'b', allows overflows (unlike normal Lua).", "bit.bsub"),
  syn("bit.rshift(<uint> val, <uint> by)", "Method", "Does a right shift on 'val' using 'by'.", "bit.rshift"),
  syn("bit.band(<uint> val, <uint> by)", "Method", "Does a logical AND (&) on 'val' using 'by'.", "bit.band"),
  syn("bit.bor(<uint> val, <uint> by)", "Method", "Does a logical OR (|) on 'val' using 'by'.", "bit.bor"),
  syn("bit.bxor(<uint> val, <uint> by)", "Method", "Does a logical XOR (^) on 'val' using 'by'.", "bit.bxor"),
  syn("bit.bnot(<uint> val)", "Method", "Does a logical NOT on 'val'.", "bit.bnot"),
  syn("bit.bmul(<uint> val, <uint> by)", "Method", "Multiplies 'val' using 'by', allows overflows (unlike normal Lua)", "bit.bmul"),
  syn("bit.bswap(<uint> val)", "Method", "Does a bitwise swap on 'val'.", "bit.bswap"),
  syn("bit.tobit(<uint> val)", "Method", "Converts 'val' into proper form for bitwise operations.", "bit.tobit"),
  syn("bit.ror(<uint> val, <uint> by)", "Method", "Rotates right 'val' using 'by'.", "bit.ror"),
  syn("bit.lshift(<uint> val, <uint> by)", "Method", "Does a left shift on 'val' using 'by'.", "bit.lshift"),
  syn("bit.tohex(<uint> val)", "Method", "Converts 'val' to a hex string.", "bit.tohex"),
  syn("debug", "Class", "Debug Library", "debug"),
  syn("debug.getconstant(<function, int> fi, <int> idx)", "Method", "Returns the constant at index 'idx' in function 'fi' or level 'fi'.", "debug.getconstant"),
  syn("debug.profilebegin(<string> label>", "Method", "Opens a microprofiler label.", "debug.profilebegin"),
  syn("debug.profileend(<void>)", "Method", "Closes the top microprofiler label.", "debug.profileend"),
  syn("debug.traceback(<void>)", "Method", "Returns a traceback of the current stack as a string.", "debug.traceback"),
  syn("debug.getfenv(<T> o)", "Method", "Returns the environment of object 'o'.", "debug.getfenv"),
  syn("debug.getupvalue(<function, int> fi, <string> upval)", "Method", "Returns the upvalue with name 'upval' in function or level 'fi'.", "debug.getupvalue"),
  syn("debug.getlocals(<int> lvl)", "Method", "Returns a table containing the upvalues at level 'lvl'.", "debug.getlocals"),
  syn("debug.setmetatable(<T> o, <table> mt)", "Method", "Set the metatable of 'o' to 'mt'.", "debug.setmetatable"),
  syn("debug.getconstants(<function, int> fi)", "Method", "Retrieve the constants in function 'fi' or at level 'fi'.", "debug.getconstants"),
  syn("debug.getupvalues(<function, int> fi)", "Method", "Retrieve the upvalues in function 'fi' or at level 'fi'.", "debug.getupvalues"),
  syn("debug.setlocal(<int> lvl, <string> localname, <T> value)", "Method", "Set local 'localname' to value 'value' at level 'lvl'.", "debug.setlocal"),
  syn("debug.setupvalue(<function, int> fi, <string> upvname, <T> value)", "Method", "Set upvalue 'upvname' to value 'value' at level or function 'fi'.", "debug.setupvalue"),
  syn(
    "debug.setconstant(<function, int> fi, <string> consname, <int, bool, nil, string> value)",
    "Method",
    "Set constant 'consname' to tuple 'value' at level or function 'fi'.",
    "debug.setupvalue",
  ),
  syn("debug.getregistry(<void>)", "Method", "Returns the registry", "debug.getregistry"),
  syn("debug.getinfo(<function, int> fi, <string> w)", "Method", "Returns a table of info pertaining to the Lua function 'fi'.", "debug.getinfo"),
  syn("debug.getlocal(<int> lvl, <string> localname)", "Method", "Returns the local with name 'localname' in level 'lvl'.", "debug.getlocal"),
  syn(
    "loadfile(<string> path)",
    "Method",
    "Loads in the contents of a file as a chunk and returns it if compilation is successful. Otherwise, if an error has occured during compilation, nil followed by the error message will be returned.",
    "loadfile",
  ),
  syn(
    "loadstring(<string> chunk, [<string> chunkname])",
    "Method",
    "Loads 'chunk' as a Lua function and returns it if compilation is succesful. Otherwise, if an error has occured during compilation, nil followed by the error message will be returned.",
    "loadstring",
  ),
  syn("writefile(<string> filepath, <string> contents)", "Method", "Writes 'contents' to the supplied filepath.", "writefile"),
  syn("mousescroll(<signed int> px)", "Method", "Scrolls the mouse wheel virtually by 'px' pixels.", "mousescroll"),
  syn("mouse2click(<void>)", "Method", "Virtually presses the right mouse button.", "mouse2click"),
  syn("islclosure(<function> f)", "Method", "Returns true if 'f' is an LClosure", "islclosure"),
  syn("mouse1press(<void>)", "Method", "Simulates a left mouse button press without releasing it.", "mouse1press"),
  syn("mouse1release(<void>)", "Method", "Simulates a left mouse button release.", "mouse1release"),
  syn(
    "keypress(<int> keycode)",
    "Method",
    "Simulates a key press for the specified keycode. For more information: https://docs.microsoft.com/en-us/windows/desktop/inputdev/virtual-key-codes",
    "keypress",
  ),
  syn("mouse2release(<void>)", "Method", "Simulates a right mouse button release.", "mouse2release"),
  syn("newcclosure(<function> f)", "Method", "Pushes a new c closure that invokes function 'f' upon call. Used for metatable hooks.", "newcclosure"),
  syn("getinstances(<void>)", "Method", "Returns a list of all instances within the game.", "getinstances"),
  syn("getnilinstances(<void>)", "Method", "Returns a list of all instances parented to nil within the game.", "getnilinstances"),
  syn("readfile(<string> path)", "Method", "Reads the contents of the file located at 'path' and returns it. If the file does not exist, it errors.", "readfile"),
  syn("getscripts(<void>)", "Method", "Returns a list of all scripts within the game.", "getscripts"),
  syn("getrunningscripts(<void>)", "Method", "Returns a list of all scripts currently running.", "getrunningscripts"),
  syn("appendfile(<string> path, <string> content)", "Method", "Appends 'content' to the file contents at 'path'. If the file does not exist, it errors", "appendfile"),
  syn("listfiles(<string> folder)", "Method", "Returns a table of files in 'folder'.", "listfiles"),
  syn("isfile(<string> path)", "Method", "Returns if 'path' is a file or not.", "isfile"),
  syn("isfolder(<string> path)", "Method", "Returns if 'path' is a folder or not.", "isfolder"),
  syn("delfolder(<string> path)", "Method", "Deletes 'folder' in the workspace directory.", "delfolder"),
  syn("delfile(<string> path)", "Method", "Deletes 'file' from the workspace directory.", "delfile"),
  syn("getreg(<void>)", "Method", "Returns the Lua registry.", "getreg"),
  syn("getgc(<void>)", "Method", "Returns a copy of the Lua GC list.", "getgc"),
  syn("mouse1click(<void>)", "Method", "Simulates a full left mouse button press.", "mouse1click"),
  syn(
    "getrawmetatable(<T> value)",
    "Method",
    "Retrieve the metatable of value irregardless of value's metatable's __metatable field. Returns nil if it doesn't exist.",
    "getrawmetatable",
  ),
  syn("setreadonly(<table> table, <bool> ro)", "Method", "Sets table's read-only value to ro", "setreadonly"),
  syn("isreadonly(<table> table)", "Method", "Returns table's read-only condition.", "isreadonly"),
  syn("getrenv(<void>)", "Method", "Returns the global Roblox environment for the LocalScript state.", "getrenv"),
  syn(
    "decompile(<LocalScript, ModuleScript, function> Script, bool Bytecode = false)",
    "Method",
    "Decompiles Script and returns the decompiled script. If the decompilation fails, then the return value will be an error message.",
    "decompile",
  ),
  syn("dumpstring(<string> Script)", "Method", "Returns the Roblox formatted bytecode for source string 'Script'.", "dumpstring"),
  syn("getloadedmodules(<void>)", "Method", "Returns all ModuleScripts loaded in the game.", "getloadedmodules"),
  syn("isrbxactive(<void>)", "Method", "Returns if the Roblox window is in focus.", "getloadedmodules"),
  syn("getcallingscript(<void>)", "Method", "Gets the script that is calling this function.", "getcallingscript"),
  syn(
    "setnonreplicatedproperty(<Instance> obj, <string> prop, <T> value)",
    "Method",
    "Sets the prop property of obj, not replicating to the server. Useful for anticheat bypasses.",
    "setnonreplicatedproperty",
  ),
  syn(
    "getconnections(<Signal> obj)",
    "Method",
    "Gets a list of connections to the specified signal. You can then use :Disable and :Enable on the connections to disable/enable them.",
    "getconnections",
  ),
  syn("getspecialinfo(<Instance> obj)", "Method", "Gets a list of special properties for MeshParts, UnionOperations, and Terrain.", "getspecialinfo"),
  syn(
    "messagebox(<string> message, <string> title, <int> options)",
    "Method",
    "Makes a MessageBox with 'message', 'title', and 'options' as options. See https://docs.microsoft.com/en-us/windows/desktop/api/winuser/nf-winuser-messagebox for more information.",
    "messagebox",
  ),
  syn(
    "messageboxasync(<string> message, <string> title, <int> options)",
    "Method",
    "Makes a MessageBox with 'message', 'title', and 'options' as options. See https://docs.microsoft.com/en-us/windows/desktop/api/winuser/nf-winuser-messagebox for more information.",
    "messageboxasync",
  ),
  syn("rconsolename(<string> title)", "Method", "Sets the currently allocated console title to 'title'.", "rconsolename"),
  syn("rconsoleinput(<void>)", "Method", "Yields until the user inputs information into ther console. Returns the input the put in.", "rconsoleinput"),
  syn("rconsoleinputasync(<void>)", "Method", "Yields until the user inputs information into ther console. Returns the input the put in.", "rconsoleinputasync"),
  syn("rconsoleprint(<string> message)", "Method", "Prints 'message' into the console.", "rconsoleprint"),
  syn("rconsoleinfo(<string> message)", "Method", "Prints 'message' into the console, with a info text before it.", "rconsoleinfo"),
  syn("rconsolewarn(<string> message)", "Method", "Prints 'message' into the console, with a warning text before it.", "rconsolewarn"),
  syn("rconsoleerr(<string> message)", "Method", "Prints 'message' into the console, with a error text before it.", "rconsoleerr"),
  syn(
    "fireclickdetector(<ClickDetector> detector, <number, nil> distance)",
    "Method",
    "Fires click detector 'detector' with 'distance'. If a distance is not provided, it will be 0.",
    "fireclickdetector",
  ),
  syn(
    "firetouchinterest(<Part> part, <TouchTransmitter> transmitter, <number> toggle)",
    "Method",
    "Fires touch 'transmitter' with 'part'. Use 0 to toggle it being touched, 1 for it not being toggled.",
    "firetouchinterest",
  ),
  syn("saveinstance(<table> t)", "Method", "Saves the Roblox game into your workspace folder.", "saveinstance"),
  syn("syn", "Class", "Synapse X Library", "syn"),
  syn("syn.crypt.encrypt(<string> data, <string> key)", "Method", "Encrypt's data with key.", "syn.crypt.encrypt"),
  syn("syn.crypt.decrypt(<string> data, <string> key)", "Method", "Decrypt's data with key.", "syn.crypt.decrypt"),
  syn("syn.crypt.hash(<string> data)", "Method", "Hashes data.", "syn.crypt.hash"),
  syn("syn.crypt.base64.encode(<string> data)", "Method", "Encodes data with bas64.", "syn.crypt.base64.encode"),
  syn("syn.crypt.base64.decode(<string> data)", "Method", "Decodes data with bas64.", "syn.crypt.base64.decode"),
  syn("syn.cache_replace(<Instance> obj, <Instance> t_obj)", "Method", "Replace obj in the cache with t_obj.", "syn.cache_replace"),
  syn("syn.cache_invalidate(<Instance> obj)", "Method", "Invalidate obj's cache entry, forcing a recache upon the next lookup.", "syn.invalidate_cache"),
  syn(
    "syn.set_thread_identity(<int> n)",
    "Method",
    "Sets the current thread identity after a Task Scheduler cycle is performed. (call wait() after invoking this function for the expected results)",
    "syn.set_thread_identity",
  ),
  syn("syn.get_thread_identity(<void>)", "Method", "Returns the current thread identity.", "syn.get_thread_identity"),
  syn("syn.is_cached(<Instance> obj)", "Method", "Returns true if the instance is currently cached within the registry.", "syn.is_cached"),
  syn("syn.write_clipboard(<string> content)", "Method", "Writes 'content' to the current Windows clipboard.", "syn.write_clipboard"),
  syn("mousemoverel(<int> x, <int> y)", "Method", "Moves the mouse cursor relatively to the current mouse position by coordinates 'x' and 'y'.", "mousemoverel"),
  syn("syn.cache_replace(<Instance> obj, <Instance> t_obj)", "Method", "Replace obj in the cache with t_obj.", "syn.cache_replace"),
  syn("syn.cache_invalidate(<Instance> obj)", "Method", "Invalidate obj's cache entry, forcing a recache upon the next lookup.", "syn.invalidate_cache"),
  syn(
    "syn.open_web_socket(<string> name)",
    "Method",
    "Open's the Synapse WebSocket with channel name. This function will not exist if the user did not enable WebSocket support in theme.json.",
    "syn.open_web_socket",
  ),
];

export const SYNAPSE_COMPLETION_DEFS: SynapseCompletionDef[] = [
  ...keywordsControlFlow.map((k) => syn(k, "Keyword", "", `${k} `)),
  ...keywordsValue.map((k) => syn(k, "Keyword", "", k)),
  syn("math.noise(<number> x, [<number> y, <number> z])", "Method", "Returns a perlin noise value.", "math.noise"),
  syn("math.clamp(<number> v, <number> min, <number> max)", "Method", "Returns v clamped to min and max.", "math.clamp"),
  syn("math.sign(<number> v)", "Method", "Returns 1 if v is positive, -1 if negative, 0 if zero.", "math.sign"),
  syn("math.round(<number> v)", "Method", "Returns v rounded to the nearest integer.", "math.round"),
  syn("math.map(<number> x, <number> inmin, <number> inmax, <number> outmin, <number> outmax)", "Method", "Maps a number from one range to another.", "math.map"),
  syn("math.lerp(<number> a, <number> b, <number> t)", "Method", "Linearly interpolates between a and b.", "math.lerp"),
  syn("math.isnan(<number> v)", "Method", "Returns true if v is NaN.", "math.isnan"),
  syn("math.isinf(<number> v)", "Method", "Returns true if v is infinite.", "math.isinf"),
  syn("math.isfinite(<number> v)", "Method", "Returns true if v is finite.", "math.isfinite"),
  
  syn("table.create(<number> size, [<T> value])", "Method", "Creates a table of size and fills it with value.", "table.create"),
  syn("table.find(<table> t, <T> value, [<number> init])", "Method", "Finds value in table t starting from index init.", "table.find"),
  syn("table.clear(<table> t)", "Method", "Clears all elements from table t.", "table.clear"),
  syn("table.freeze(<table> t)", "Method", "Freezes a table, making it read-only.", "table.freeze"),
  syn("table.isfrozen(<table> t)", "Method", "Returns true if the table is frozen.", "table.isfrozen"),
  syn("table.clone(<table> t)", "Method", "Returns a shallow copy of table t.", "table.clone"),
  syn("table.pack(<tuple> ...)", "Method", "Packs a tuple into a table.", "table.pack"),
  syn("table.unpack(<table> t, [<number> i, <number> j])", "Method", "Unpacks a table into a tuple.", "table.unpack"),
  syn("table.move(<table> a1, <number> f, <number> e, <number> t, [<table> a2])", "Method", "Moves elements from table a1 to table a2.", "table.move"),

  syn("buffer.create(<number> size)", "Method", "Creates a new buffer of the specified size.", "buffer.create"),
  syn("buffer.fromstring(<string> s)", "Method", "Creates a new buffer containing a copy of the string.", "buffer.fromstring"),
  syn("buffer.tostring(<buffer> b)", "Method", "Returns a string containing a copy of the buffer's data.", "buffer.tostring"),
  syn("buffer.len(<buffer> b)", "Method", "Returns the length of the buffer in bytes.", "buffer.len"),
  syn("buffer.readi8(<buffer> b, <number> offset)", "Method", "Reads an 8-bit signed integer from the buffer.", "buffer.readi8"),
  syn("buffer.readu8(<buffer> b, <number> offset)", "Method", "Reads an 8-bit unsigned integer from the buffer.", "buffer.readu8"),
  syn("buffer.readi16(<buffer> b, <number> offset)", "Method", "Reads a 16-bit signed integer from the buffer.", "buffer.readi16"),
  syn("buffer.readu16(<buffer> b, <number> offset)", "Method", "Reads a 16-bit unsigned integer from the buffer.", "buffer.readu16"),
  syn("buffer.readi32(<buffer> b, <number> offset)", "Method", "Reads a 32-bit signed integer from the buffer.", "buffer.readi32"),
  syn("buffer.readu32(<buffer> b, <number> offset)", "Method", "Reads a 32-bit unsigned integer from the buffer.", "buffer.readu32"),
  syn("buffer.readf32(<buffer> b, <number> offset)", "Method", "Reads a 32-bit floating-point number from the buffer.", "buffer.readf32"),
  syn("buffer.readf64(<buffer> b, <number> offset)", "Method", "Reads a 64-bit floating-point number from the buffer.", "buffer.readf64"),
  syn("buffer.writei8(<buffer> b, <number> offset, <number> value)", "Method", "Writes an 8-bit signed integer to the buffer.", "buffer.writei8"),
  syn("buffer.writeu8(<buffer> b, <number> offset, <number> value)", "Method", "Writes an 8-bit unsigned integer to the buffer.", "buffer.writeu8"),
  syn("buffer.writei16(<buffer> b, <number> offset, <number> value)", "Method", "Writes a 16-bit signed integer to the buffer.", "buffer.writei16"),
  syn("buffer.writeu16(<buffer> b, <number> offset, <number> value)", "Method", "Writes a 16-bit unsigned integer to the buffer.", "buffer.writeu16"),
  syn("buffer.writei32(<buffer> b, <number> offset, <number> value)", "Method", "Writes a 32-bit signed integer to the buffer.", "buffer.writei32"),
  syn("buffer.writeu32(<buffer> b, <number> offset, <number> value)", "Method", "Writes a 32-bit unsigned integer to the buffer.", "buffer.writeu32"),
  syn("buffer.writef32(<buffer> b, <number> offset, <number> value)", "Method", "Writes a 32-bit floating-point number to the buffer.", "buffer.writef32"),
  syn("buffer.writef64(<buffer> b, <number> offset, <number> value)", "Method", "Writes a 64-bit floating-point number to the buffer.", "buffer.writef64"),
  syn("buffer.readstring(<buffer> b, <number> offset, <number> count)", "Method", "Reads a string of count bytes from the buffer.", "buffer.readstring"),
  syn("buffer.writestring(<buffer> b, <number> offset, <string> value, [<number> count])", "Method", "Writes a string to the buffer.", "buffer.writestring"),
  syn("buffer.copy(<buffer> target, <number> targetOffset, <buffer> source, [<number> sourceOffset, <number> count])", "Method", "Copies data from source buffer to target buffer.", "buffer.copy"),
  syn("buffer.fill(<buffer> b, <number> offset, <number> value, [<number> count])", "Method", "Fills the buffer with the given value.", "buffer.fill"),
  
  syn("task.spawn(<function|thread> f, <tuple> ...)", "Method", "Resumes a thread immediately.", "task.spawn"),
  syn("task.defer(<function|thread> f, <tuple> ...)", "Method", "Resumes a thread at the end of the current frame.", "task.defer"),
  syn("task.delay(<number> sec, <function|thread> f, <tuple> ...)", "Method", "Resumes a thread after a specific delay.", "task.delay"),
  syn("task.wait(<number> sec)", "Method", "Yields the current thread for a specific duration.", "task.wait"),
  syn("task.cancel(<thread> t)", "Method", "Cancels a scheduled or running thread.", "task.cancel"),

  syn("utf8.charpattern", "Keyword", "The pattern to match a single UTF-8 character.", "utf8.charpattern"),
  syn("utf8.char(<number> ...)", "Method", "Receives zero or more integers, converts each one to its corresponding UTF-8 byte sequence.", "utf8.char"),
  syn("utf8.codepoint(<string> s, [<number> i, <number> j])", "Method", "Returns the codepoints from all characters in s that start between byte position i and j.", "utf8.codepoint"),
  syn("utf8.codes(<string> s)", "Method", "Returns values so that the construction for p, c in utf8.codes(s) do body end will iterate over all characters in string s.", "utf8.codes"),
  syn("utf8.len(<string> s, [<number> i, <number> j])", "Method", "Returns the number of UTF-8 characters in string s that start between positions i and j.", "utf8.len"),
  syn("utf8.offset(<string> s, <number> n, [<number> i])", "Method", "Returns the position (in bytes) where the encoding of the n-th character of s starts.", "utf8.offset"),

  syn("bit32.arshift(<number> x, <number> disp)", "Method", "Returns the number x shifted disp bits to the right. The number disp may be any representable integer. Negative displacements shift to the left.", "bit32.arshift"),
  syn("bit32.band(<number> ...)", "Method", "Returns the bitwise and of its operands.", "bit32.band"),
  syn("bit32.bnot(<number> x)", "Method", "Returns the bitwise negation of x.", "bit32.bnot"),
  syn("bit32.bor(<number> ...)", "Method", "Returns the bitwise or of its operands.", "bit32.bor"),
  syn("bit32.btest(<number> ...)", "Method", "Returns a boolean signaling whether the bitwise and of its operands is different from zero.", "bit32.btest"),
  syn("bit32.bxor(<number> ...)", "Method", "Returns the bitwise exclusive or of its operands.", "bit32.bxor"),
  syn("bit32.extract(<number> n, <number> field, [<number> width])", "Method", "Returns the unsigned number formed by the bits field to field + width - 1 from n.", "bit32.extract"),
  syn("bit32.lrotate(<number> x, <number> disp)", "Method", "Returns the number x rotated disp bits to the left. The number disp may be any representable integer.", "bit32.lrotate"),
  syn("bit32.lshift(<number> x, <number> disp)", "Method", "Returns the number x shifted disp bits to the left. The number disp may be any representable integer. Negative displacements shift to the right.", "bit32.lshift"),
  syn("bit32.replace(<number> n, <number> v, <number> field, [<number> width])", "Method", "Returns a copy of n with the bits field to field + width - 1 replaced by the value v.", "bit32.replace"),
  syn("bit32.rrotate(<number> x, <number> disp)", "Method", "Returns the number x rotated disp bits to the right. The number disp may be any representable integer.", "bit32.rrotate"),
  syn("bit32.rshift(<number> x, <number> disp)", "Method", "Returns the number x shifted disp bits to the right. The number disp may be any representable integer. Negative displacements shift to the left.", "bit32.rshift"),

  syn("string.split(<string> s, [<string> separator])", "Method", "Splits the string into a table of strings, based on the separator.", "string.split"),
  syn("string.pack(<string> fmt, <T> v1, <T> v2, ...)", "Method", "Returns a binary string containing the values v1, v2, etc. serialized in binary form according to the format string fmt.", "string.pack"),
  syn("string.packsize(<string> fmt)", "Method", "Returns the size of a string resulting from string.pack with the given format.", "string.packsize"),
  syn("string.unpack(<string> fmt, <string> s, [<number> pos])", "Method", "Returns the values packed in string s according to the format string fmt.", "string.unpack"),

  syn("cloneref(<Instance> obj)", "Method", "Returns a cloned reference of obj. Bypasses certain anticheats checking reference equality.", "cloneref"),
  
  syn("Debris", "Class", "Roblox Debris Service", "Debris"),
  syn("CoreGui", "Class", "Roblox CoreGui Service", "CoreGui"),
  syn("Players", "Class", "Roblox Players Service", "Players"),
  syn("VRService", "Class", "Roblox VRService", "VRService"),
  syn("RunService", "Class", "Roblox RunService", "RunService"),
  syn("StarterGui", "Class", "Roblox StarterGui Service", "StarterGui"),
  syn("GuiService", "Class", "Roblox GuiService", "GuiService"),
  syn("HttpService", "Class", "Roblox HttpService", "HttpService"),
  syn("TextService", "Class", "Roblox TextService", "TextService"),
  syn("TweenService", "Class", "Roblox TweenService", "TweenService"),
  syn("TextChatService", "Class", "Roblox TextChatService", "TextChatService"),
  syn("UserInputService", "Class", "Roblox UserInputService", "UserInputService"),
  syn("ContextActionService", "Class", "Roblox ContextActionService", "ContextActionService"),
  syn("VirtualUser", "Class", "Roblox VirtualUser Service", "VirtualUser"),

  ...explicit,
];

let registered = false;

export function registerSynapseLuaCompletion(monaco: typeof import("monaco-editor")): void {
  if (registered) return;
  registered = true;

  const Kind = monaco.languages.CompletionItemKind;

  const items: import("monaco-editor").languages.CompletionItem[] = SYNAPSE_COMPLETION_DEFS.map((d) => ({
    label: d.label,
    kind: d.kind === KW ? Kind.Keyword : d.kind === CLS ? Kind.Class : Kind.Method,
    documentation: d.documentation || undefined,
    insertText: d.insertText,
  }));

  monaco.languages.registerCompletionItemProvider("luau", {
    triggerCharacters: [".", "("],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const before = line.slice(0, position.column - 1);
      const wordMatch = /[\w.]*$/.exec(before);
      const word = wordMatch ? wordMatch[0] : "";
      const startCol = position.column - word.length;
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: startCol,
        endColumn: position.column,
      };
      const w = word.toLowerCase();
      const suggestions = items
        .filter((it) => {
          if (!w) return true;
          return it.label.toLowerCase().includes(w) || (it.insertText && it.insertText.toLowerCase().startsWith(w));
        })
        .map((it) => ({ ...it, range }));
      return { suggestions };
    },
  });
}

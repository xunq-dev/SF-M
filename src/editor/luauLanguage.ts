/**
 * Luau language definition for Monaco Editor.
 * Ported from MonaLuau (MIT License, Copyright Microsoft Corporation).
 *
 * Provides full Monarch tokenizer support for Roblox Luau syntax including:
 * - Type annotations, compound assignments, `continue`, string interpolation
 * - Roblox API classes, enums, and library functions
 * - Proper bracket matching and auto-closing pairs
 */

import * as monaco from "monaco-editor";

/* ── Language configuration ────────────────────────────────────────────── */

const conf: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: "--",
    blockComment: ["--[[", "]]"],
  },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
    ["do", "end"],
    ["then", "end"],
    ["repeat", "until"],
    ["function", "end"],
  ],
  indentationRules: {
    increaseIndentPattern:
      /(((else|function|then|do|repeat)((?!(end|until)\b).)*)|(\{\s*))$/,
    decreaseIndentPattern:
      /^\s*((\b(elseif|else|end|until)\b)|(\})|(\)))\)/,
  },
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: "`", close: "`" },
  ],
  surroundingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: "do", close: "end" },
    { open: "then", close: "end" },
    { open: "if", close: "end" },
    { open: "for", close: "end" },
    { open: "function", close: "end" },
    { open: "`", close: "`" },
  ],
  folding: {
    markers: {
      start: /^\s*\/\/\s*(?:(?:#?region\b)|(?:<editor-fold\b))/,
      end: /^\s*\/\/\s*(?:(?:#?endregion\b)|(?:<\/editor-fold>))/,
    },
  },
};

/* ── Monarch tokenizer ─────────────────────────────────────────────────── */

const language: monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".lua",
  keywords:
    "and break continue do else elseif end for function if in local not or repeat return then until while next type".split(
      " "
    ),
  constants: "true false nil".split(" "),
  brackets: [
    { token: "delimiter.bracket", open: "{", close: "}" },
    { token: "delimiter.array", open: "[", close: "]" },
    { token: "delimiter.parenthesis", open: "(", close: ")" },
  ],
  globals: [
    "print", "error", "warn", "require", "game", "assert",
    "rawset", "rawget", "rawequal",
    "bit32", "math",
    "cache", "cache.invalidate", "cache.iscached", "cache.replace",
    "debug", "getupvalue", "getconstant", "setstack", "getproto",
    "getstack", "getfunctionname", "profilebegin", "getprotos",
    "traceback", "getconstants", "getinfo", "setupvalue", "setconstant",
    "profileend", "getupvalues",
    "string",
  ],
  operators: [
    "+", "-", "*", "/", "%", "^", "#", "=",
    "..", "...", "+=", "-=", "*=", "/=", "..=",
  ],
  special_operators: ["==", "~=", "<=", ">=", "<", ">", "->"],
  symbols: /[=><~?:&|+\-*\/\^%\#\.]+/,
  escapes:
    /\\(?:[abfnrtv\\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  regexpctl: /[(){}\[\]\$\^\|\-*+?\.]/,
  regexpesc:
    /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,
  tokenizer: {
    root: [
      // Functions and type annotations:
      [
        /(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*[\.:][a-zA-Z_][a-zA-Z0-9_]*)(\<.+\>)(\())/,
        "",
        "@function_decl",
      ],
      [
        /(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*[\.:][a-zA-Z_][a-zA-Z0-9_]*\s*)(\())/,
        "",
        "@function_decl",
      ],
      [
        /(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*)(\<.+\>)(\())/,
        "",
        "@function_decl",
      ],
      [
        /(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*\s*)(\())/,
        "",
        "@function_decl",
      ],
      [
        /(?=(function)(\s+[a-zA-Z_][a-zA-Z0-9_]*\s*)(\())/,
        "",
        "@function_decl",
      ],
      [/(?=(function)(\())/, "", "@function_decl"],

      // identifiers and keywords
      [/(?<![^.]\.|\:)\b(self)\b/, "variable.language.self"],
      [
        /(?<![^.]\.|\:)\b(workspace|game|script|plugin|shared|_G|_VERSION|math\.(pi|huge))\b|(?<![.])\.{3}(?!\.)/,
        "constant.language",
      ],
      [
        /(?<![^.]\.|\:)\b(assert|collectgarbage|error|getfenv|getmetatable|ipairs|loadstring|next|pairs|pcall|print|rawequal|rawget|rawset|require|select|setfenv|setmetatable|tonumber|tostring|type|unpack|xpcall|typeof|wait|delay|settings|elapsedTime|tick|time|warn|spawn|newproxy|UserSettings)\b(?=\s*(?:[({\"']|\[\[))/,
        "support.function",
      ],
      [
        /(?<![^.]\.|\:)\b(cache\.(iscached|replace|invalidate))|(coroutine\.(create|resume|running|status|wrap|yield|isyieldable)|string\.(byte|char|dump|find|format|gmatch|gsub|len|lower|match|rep|reverse|sub|upper|split|packsize|pack|unpack)|table\.(concat|insert|maxn|remove|sort|create|find|foreach|foreachi|getn|move|pack|unpack|clear)|math\.(abs|acos|asin|atan2?|ceil|cosh?|deg|exp|floor|fmod|frexp|ldexp|log|log10|max|min|modf|pow|rad|random|randomseed|tointeger|type|ult|noise|clamp|sign|sinh?|sqrt|tanh?|round)|io\.(close|flush|input|lines|open|output|popen|read|tmpfile|type|write)|os\.(clock|date|difftime|execute|exit|getenv|remove|rename|setlocale|time|tmpname)|package\.(cpath|loaded|loadlib|path|preload|seeall)|debug\.(debug|[gs]etfenv|[gs]ethook|getinfo|[gs]etlocal|[gs]etmetatable|getregistry|[gs]etupvalue|traceback|profileend|profilebegin)|utf8\.(char|codes|codepoint|len|offset|graphemes|charpattern|nfcnormalize|nfdnormalize)|bit32\.(arshift|band|bnot|bor|btest|bxor|extract|lrotate|lshift|replace|rrotate|rshift))\b(?=\s*(?:[({\"']|\[\[))/,
        "support.function.library",
      ],
      [
        /\b(Axes|BrickColor|CFrame|Color3|ColorSequence|ColorSequenceKeypoint|DateTime|DockWidgetPluginGuiInfo|Faces|Instance|NumberRange|NumberSequence|NumberSequenceKeypoint|PathWaypoint|PhysicalProperties|Random|Ray|RaycastParams|Rect|Region3|Region3int16|TweenInfo|UDim|UDim2|Vector2|Vector2int16|Vector3|Vector3int16|Drawing|Krnl|task)\b/,
        "support.type",
      ],
      [/\b(local|type)\b/, "keyword.local"],
      [
        /\b(and|break|continue|do|else|elseif|end|for|function|if|in|local|not|or|repeat|return|then|until|while|next)\b/,
        "keyword",
      ],

      [
        /\b([a-zA-Z_][a-zA-Z0-9_]*)\b(?=\s*(?:[({\"']|\[\[))/,
        "entity.name.function",
      ],
      [/\b([A-Z_][A-Z0-9_]*)\b/, "variable.other.constant"],

      [
        /(Enum)(\.)(\w*)(\.)(\w*)/,
        [
          "variable.other.enummember.lua",
          "",
          "variable.other.enummember.lua",
          "",
          "variable.other.enummember.lua",
        ],
      ],
      [
        /(Enum)(\.)(\w*)/,
        [
          "variable.other.enummember.lua",
          "",
          "variable.other.enummember.lua",
        ],
      ],

      // Type declarations:
      [/(?=\b(export|type)\b\s*[a-zA-Z_])/, "", "@type_decl"],

      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            "@keywords": { token: "keyword.$0" },
            "@constants": { token: "constants.$0" },
            "@globals": { token: "global" },
            "@default": "identifier",
          },
        },
      ],

      // whitespace
      { include: "@whitespace" },

      // index
      [
        /(?=(\.+[a-zA-Z_][a-zA-Z0-9_]*))(?!(\.+[a-zA-Z_][a-zA-Z0-9_]*)\()/,
        "",
        "@index",
      ],

      // delimiters and operators
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
      [/`/, "string", "@string_backtick"],
      [/\[([=]*)\[/, "delimiter.longstring", "@longstring.$1"],
      [/[{}()\[\]]/, "@brackets"],
      [
        /@symbols/,
        {
          cases: {
            "@operators": "operator",
            "@special_operators": "operator.special",
            "@default": "",
          },
        },
      ],
      // numbers
      [/(@digits)[eE]([\-+]?(@digits))?/, "number.float"],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, "number.float"],
      [/0[xX](@hexdigits)n?/, "number.hex"],
      [/0[oO]?(@octaldigits)n?/, "number.octal"],
      [/0[bB](@binarydigits)n?/, "number.binary"],
      [/(@digits)n?/, "number"],
      // delimiter: after number because of .\d floats
      [/[;,.]/, "delimiter"],
      // strings: recover on non-terminated strings
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/'([^'\\]|\\.)*$/, "string.invalid"],
      [/`([^`\\]|\\.)*$/, "string.invalid"],
    ],

    regexp: [
      [
        /(\{)(\d+(?:,\d*)?)(\})/,
        [
          "regexp.escape.control",
          "regexp.escape.control",
          "regexp.escape.control",
        ],
      ],
      [
        /(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/,
        [
          "regexp.escape.control",
          {
            token: "regexp.escape.control",
            next: "@regexrange",
          },
        ],
      ],
      [
        /(\()(\?:|\?=|\?!)/,
        ["regexp.escape.control", "regexp.escape.control"],
      ],
      [/[()]/, "regexp.escape.control"],
      [/@regexpctl/, "regexp.escape.control"],
      [/[^\\\/]/, "regexp"],
      [/@regexpesc/, "regexp.escape"],
      [/\\\./, "regexp.invalid"],
      [
        /(\/)([gimsuy]*)/,
        [
          {
            token: "regexp",
            bracket: "@close",
            next: "@pop",
          },
          "keyword.other",
        ],
      ],
    ],

    // Safe symbols:
    index: [
      [/\.[^a-zA-Z_]/, "", "@pop"],
      [/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.property", "@pop"],
    ],

    // Tables & type tables:
    type_decl: [
      [/\s*export\s+/, "keyword.control.export"],
      [/\s*type\s+/, "storage.type"],
      [/\b[a-zA-Z_][a-zA-Z0-9_]*\b\s*/, "entity.name.type.alias"],
      [/\</, "punctuation.definition.typeparameters", "@type_group"],
      [/\s*=\s*{/, "@rematch", "@table_type_elements_popall"],
      [/./, "", "@pop"],
    ],
    table_type_elements_popall: [
      [
        /(\s*=\s*)({)/,
        ["keyword.operator", "punctuation.definition.block"],
      ],
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/'([^'\\]|\\.)*$/, "string.invalid"],
      [/"/, "string.delimeter", '@string."'],
      [/'/, "string.delimeter", "@string.'"],
      [/`/, "string.delimeter", "@string.`"],
      [/[\[\]]/, "punctuation.definition.block"],
      [/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.object.property"],
      [/{/, "punctuation.definition.block", "@table_type_elements"],
      [/: |\?: /, "keyword.operator.typedef.annotation", "@type_name"],
      [/[,\;]/, "punctuation.separator.table"],
      [/}/, "punctuation.definition.block", "@popall"],
      { include: "@whitespace" },
    ],
    table_type_elements: [
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/'([^'\\]|\\.)*$/, "string.invalid"],
      [/"/, "string.delimeter", '@string."'],
      [/'/, "string.delimeter", "@string.'"],
      [/`/, "string.delimeter", "@string.`"],
      [/[\[\]]/, "punctuation.definition.block"],
      [/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.object.property"],
      [/[\<\>]/, "punctuation.definition.typeparameters"],
      [/{/, "punctuation.definition.block", "@table_type_elements"],
      [/: |\?: /, "keyword.operator.typedef.annotation", "@type_name"],
      [/[,\;]/, "punctuation.separator.table"],
      [/}/, "punctuation.definition.block", "@pop"],
      { include: "@whitespace" },
    ],

    // Functions & types:
    function_decl: [
      [/function/, "keyword.control"],
      [
        /(\s+[a-zA-Z_][a-zA-Z0-9_]*)([\.:])([a-zA-Z_][a-zA-Z0-9_]*\s*)/,
        [
          "entity.name.function",
          "punctuation.separator.parameter",
          "entity.name.function",
        ],
      ],
      [/\s+[a-zA-Z_][a-zA-Z0-9_]*\s*/, "entity.name.function"],
      [/\</, "punctuation.definition.typeparameters", "@type_group"],
      [/\(/, "punctuation.definition.parameters", "@function_params"],
      [/\)/, "punctuation.definition.parameters", "@pop"],
    ],
    type_operators: [
      [/(\\~|\\-\\>)/, "operator.type"],
      [/[&|?]/, "punctuation.definition.parameters"],
      [/\.\.\./, "variable.parameter.variadic"],
    ],
    type_group: [
      [/[([]/, "punctuation.definition.parameters", "@type_group"],
      [/[{]/, "punctuation.definition.block", "@table_type_elements"],
      [/[\<]/, "punctuation.definition.typeparameters", "@type_group"],
      [/[a-zA-Z_][a-zA-Z0-9_]*/, "support.type"],
      { include: "@type_operators" },
      [/,/, "punctuation"],
      [/[>]/, "punctuation.definition.typeparameters", "@pop"],
      [/[)\]}]/, "punctuation.definition.parameters", "@pop"],
    ],
    type_name: [
      [/\[,/, "punctuation.definition.parameters", "@pop"],
      [
        /(\(|\[[^\,])/,
        "punctuation.definition.parameters",
        "@type_group",
      ],
      [/[{]/, "punctuation.definition.block", "@table_type_elements"],
      [/[a-zA-Z_][a-zA-Z0-9_]*/, "support.type"],
      [/[\<\>]/, "punctuation.definition.typeparameters"],
      { include: "@type_operators" },
      [/(?=[)\]},;])/, "punctuation.definition.parameters", "@pop"],
    ],
    function_params: [
      [/[([\\]]/, "punctuation.definition.parameters"],
      [/\.\.\./, "variable.parameter.variadic"],
      [/[a-zA-Z_][a-zA-Z0-9_]*/, "variable.parameter.function"],
      [/: |\?: /, "keyword.operator.type.annotation", "@type_name"],
      [/,/, "punctuation.separator.arguments"],
      [/(?=\))/, "", "@pop"],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ""],
      [/--\[([=]*)\[/, "comment", "@comment.$1"],
      [/--.*$/, "comment"],
    ],
    comment: [
      [/(?=(\@\w+)((\[\w+\])?\s*)[\{])/, "", "@comment_highlight"],
      [/(\@)(\w+\s*)/, ["operator", "comment.highlight.descriptor"]],
      [/\t+\# \w.+/, "comment.highlight.title"],
      [
        /\]([=]*)\]/,
        {
          cases: {
            "$1==$S2": { token: "comment", next: "@pop" },
            "@default": "comment",
          },
        },
      ],
      [/./, "comment"],
    ],
    comment_highlight: [
      [/(\@)(\w+\s*)/, ["operator", "comment.highlight.descriptor"]],
      [
        /(\[)(\w+)(\]\s*)/,
        [
          "comment.delimiter.modifier",
          "comment.highlight.modifier",
          "comment.delimiter.modifier",
        ],
      ],
      [/\{/, "punctuation.definition.parameters", "@type_group"],
      [/(([^\t]| )[a-z][a-zA-Z0-9_]*)/, "comment.highlight.name", "@pop"],
      [/./, "@rematch", "@pop"],
    ],
    longstring: [
      [/[^\]]+/, "longstring"],
      [
        /\]([=]*)\]/,
        {
          cases: {
            "$1==$S2": {
              token: "delimiter.longstring",
              next: "@pop",
            },
            "@default": "delimiter.longstring",
          },
        },
      ],
      [/./, "longstring"],
    ],
    regexrange: [
      [/-/, "regexp.escape.control"],
      [/\^/, "regexp.invalid"],
      [/@regexpesc/, "regexp.escape"],
      [/[^\]]/, "regexp"],
      [
        /\]/,
        {
          token: "regexp.escape.control",
          next: "@pop",
          bracket: "@close",
        },
      ],
    ],
    string: [
      [/[^\\"'`]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [
        /["'`]/,
        {
          cases: {
            "$#==$S2": {
              token: "string.delimeter",
              next: "@pop",
            },
            "@default": "string",
          },
        },
      ],
    ],
    string_double: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, "string", "@pop"],
    ],
    string_single: [
      [/[^\\']+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/'/, "string", "@pop"],
    ],
    string_backtick: [
      [
        /\{/,
        {
          token: "delimiter.bracket",
          next: "@bracketCounting",
        },
      ],
      [/[^\\`\{]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/`/, "string", "@pop"],
    ],
    bracketCounting: [
      [/\{/, "delimiter.bracket", "@bracketCounting"],
      [/\}/, "delimiter.bracket", "@pop"],
      {
        include: "root",
      },
    ],
  },
};

/* ── Registration ──────────────────────────────────────────────────────── */

let registered = false;

/**
 * Register the `"luau"` language with Monaco.  Safe to call multiple times;
 * only registers on the first invocation.
 */
export function registerLuauLanguage(m: typeof monaco): void {
  if (registered) return;
  registered = true;

  m.languages.register({
    id: "luau",
    aliases: ["luau", "lua", "RLua"],
    extensions: [".lua", ".luau", ".rbxs"],
    mimetypes: ["text/x-luau"],
  });

  m.languages.setLanguageConfiguration("luau", conf);
  m.languages.setMonarchTokensProvider("luau", language);
}

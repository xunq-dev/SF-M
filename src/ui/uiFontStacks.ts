/**
 * Global UI font stacks. Most entries are web-safe / OS-first; **Minecraft Seven** uses local
 * @font-face rules in `src/styles/fonts.css` (bundled OFL font, see file header there).
 */
export const UI_FONT_OPTIONS = [
  {
    id: "inter",
    label: "Inter",
    stack: 'Inter, "Inter Fallback", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "system",
    label: "System UI",
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: "segoe",
    label: "Segoe UI",
    stack: '"Segoe UI", "Segoe UI Symbol", Tahoma, Geneva, Verdana, sans-serif',
  },
  {
    id: "segoe-light",
    label: "Segoe UI (light UI)",
    stack: '"Segoe UI", "Segoe UI Web", Calibri, Candara, sans-serif',
  },
  {
    id: "roboto",
    label: "Roboto / Arial",
    stack: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  {
    id: "helvetica",
    label: "Helvetica / Arial",
    stack: 'Helvetica, "Helvetica Neue", Arial, "Liberation Sans", sans-serif',
  },
  {
    id: "verdana",
    label: "Verdana",
    stack: 'Verdana, Geneva, Tahoma, sans-serif',
  },
  {
    id: "trebuchet",
    label: "Trebuchet MS",
    stack: '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", sans-serif',
  },
  {
    id: "lucida",
    label: "Lucida Grande",
    stack: '"Lucida Grande", "Lucida Sans Unicode", "Segoe UI", sans-serif',
  },
  {
    id: "tahoma",
    label: "Tahoma",
    stack: 'Tahoma, Verdana, "Segoe UI", sans-serif',
  },
  {
    id: "century",
    label: "Century Gothic",
    stack: '"Century Gothic", CenturyGothic, "Apple Gothic", sans-serif',
  },
  {
    id: "franklin",
    label: "Franklin Gothic",
    stack: '"Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif',
  },
  {
    id: "gill",
    label: "Gill Sans",
    stack: '"Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", sans-serif',
  },
  {
    id: "optima",
    label: "Optima",
    stack: 'Optima, "Segoe UI", Candara, Calibri, sans-serif',
  },
  {
    id: "avenir",
    label: "Avenir / SF",
    stack: 'Avenir, "Avenir Next", -apple-system, "SF Pro Text", system-ui, sans-serif',
  },
  {
    id: "candara",
    label: "Candara / Corbel",
    stack: 'Candara, Corbel, "Segoe UI", Calibri, sans-serif',
  },
  {
    id: "constantia",
    label: "Constantia / Cambria",
    stack: 'Constantia, Cambria, Georgia, serif',
  },
  {
    id: "georgia",
    label: "Georgia",
    stack: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: "palatino",
    label: "Palatino",
    stack: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  {
    id: "book-antiqua",
    label: "Book Antiqua",
    stack: '"Book Antiqua", Palatino, "Palatino Linotype", serif',
  },
  {
    id: "garamond",
    label: "Garamond",
    stack: 'Garamond, "Palatino Linotype", "Times New Roman", serif',
  },
  {
    id: "times",
    label: "Times / Cambria",
    stack: 'Cambria, "Times New Roman", Times, "Liberation Serif", serif',
  },
  {
    id: "noto-sans",
    label: "Noto-style sans",
    stack: '"Noto Sans", "Open Sans", Roboto, "Segoe UI", Arial, sans-serif',
  },
  {
    id: "ibm-plex",
    label: "IBM Plex-style",
    stack: '"IBM Plex Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: "source-sans",
    label: "Source Sans-style",
    stack: '"Source Sans 3", "Source Sans Pro", "Segoe UI", Roboto, Arial, sans-serif',
  },
  {
    id: "courier",
    label: "Courier",
    stack: '"Courier New", Courier, "Liberation Mono", monospace',
  },
  {
    id: "mono",
    label: "Monospace (code)",
    stack: 'ui-monospace, "SF Mono", Monaco, Menlo, Consolas, "Liberation Mono", monospace',
  },
  {
    id: "script-hand",
    label: "Handwriting (script)",
    stack:
      'ui-serif, "Segoe Script", "Brush Script MT", "Lucida Handwriting", "Snell Roundhand", "Apple Chancery", cursive',
  },
  {
    id: "comic",
    label: "Comic / playful",
    stack: '"Comic Sans MS", "Comic Neue", "Chalkboard SE", "Trebuchet MS", sans-serif',
  },
  {
    id: "blocky-poster",
    label: "Blocky / poster",
    stack: 'Impact, "Arial Black", "Franklin Gothic Heavy", Haettenschweiler, "Helvetica Neue", sans-serif',
  },
  {
    id: "minecraft-seven",
    label: "Minecraft Seven (Java UI / Mojangles-style)",
    stack: '"Minecraft Seven", "Courier New", Courier, monospace',
  },
  {
    id: "chalk-marker",
    label: "Chalk / marker",
    stack: '"Chalkduster", "Marker Felt", "Segoe Print", "Comic Sans MS", fantasy',
  },
  {
    id: "papyrus",
    label: "Rough / Papyrus",
    stack: "Papyrus, Herculanum, fantasy, serif",
  },
  {
    id: "typewriter",
    label: "Typewriter",
    stack: '"American Typewriter", "Courier New", Courier, monospace',
  },
  {
    id: "rounded-ui",
    label: "Rounded UI",
    stack: 'ui-rounded, system-ui, "SF Pro Rounded", "Segoe UI", sans-serif',
  },
  {
    id: "western-slab",
    label: "Western / slab",
    stack: 'Rockwell, "Rockwell Nova", "Courier New", "French Clarendon", serif',
  },
  {
    id: "kids-fat",
    label: "Kids / fat marker",
    stack: '"Marker Felt", "Comic Sans MS", "Trebuchet MS", fantasy',
  },
  {
    id: "brush-gothic",
    label: "Brush / gothic script",
    stack: '"Segoe Script", "Lucida Calligraphy", "Bradley Hand", "Brush Script MT", cursive',
  },
  {
    id: "stencil",
    label: "Stencil / army",
    stack: 'Stencil, "Arial Black", Impact, "Franklin Gothic Heavy", fantasy',
  },
] as const;

export type UiFontId = (typeof UI_FONT_OPTIONS)[number]["id"];

const IDS = new Set<string>(UI_FONT_OPTIONS.map((o) => o.id));

export function getUiFontStack(id: string): string {
  const opt = UI_FONT_OPTIONS.find((o) => o.id === id);
  return opt?.stack ?? UI_FONT_OPTIONS[0].stack;
}

export function normalizeUiFontId(id: unknown): UiFontId {
  if (typeof id !== "string") return "inter";
  /** Legacy id before bundled OFL Minecraft Seven font */
  if (id === "minecraft-pixel") return "minecraft-seven";
  return IDS.has(id) ? (id as UiFontId) : "inter";
}

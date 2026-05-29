export type LiveEditColorFormat = "hex" | "rgba";

export function parseRgba(value: string): { r: number; g: number; b: number; a: number } | null {
  const m = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return null;
  return {
    r: Math.round(Number(m[1])),
    g: Math.round(Number(m[2])),
    b: Math.round(Number(m[3])),
    a: m[4] !== undefined ? Number(m[4]) : 1,
  };
}

export function rgbaToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const to2 = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Normalize any supported color string to #rrggbb for the native color input. */
export function colorToHexInput(value: string): string {
  const rgb = hexToRgb(value);
  if (rgb) return value.toLowerCase();
  const parsed = parseRgba(value);
  if (parsed) return rgbaToHex(parsed.r, parsed.g, parsed.b);
  return "#000000";
}

export function colorAlpha(value: string): number {
  const parsed = parseRgba(value);
  if (parsed) return parsed.a;
  return 1;
}

export function composeColor(format: LiveEditColorFormat, hex: string, alpha: number): string {
  if (format === "hex") return hex.toLowerCase();
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(a.toFixed(2))})`;
}

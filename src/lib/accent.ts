/** Deriva tokens de acento accesibles a partir del color de una organización. */
type RGB = [number, number, number];

const DEFAULT = "#1d4ed8";
const LIGHT_SURFACE: RGB = [255, 255, 255];
const DARK_SURFACE: RGB = [21, 27, 36]; // --color-white en modo oscuro
const DARK_TEXT: RGB = [17, 24, 39];

function parse(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: RGB, b: RGB) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Acerca el color a `toward` hasta alcanzar el contraste pedido contra `surface`. */
function ensureContrast(c: RGB, surface: RGB, toward: RGB, min = 4.5): RGB {
  for (let t = 0; t <= 1; t += 0.04) {
    const candidate = mix(c, toward, t);
    if (contrast(candidate, surface) >= min) return candidate;
  }
  return toward;
}

export type AccentVars = Record<string, string>;

export function accentVars(hex?: string | null): AccentVars {
  const base = parse(hex ?? "") ?? parse(DEFAULT)!;
  const onPrimary = contrast(base, LIGHT_SURFACE) >= contrast(base, DARK_TEXT) ? "#ffffff" : toHex(DARK_TEXT);
  return {
    "--color-primary": toHex(base),
    "--color-on-primary": onPrimary,
    "--accent-ink-light": toHex(ensureContrast(base, LIGHT_SURFACE, [0, 0, 0])),
    "--accent-ink-dark": toHex(ensureContrast(base, DARK_SURFACE, [255, 255, 255])),
  };
}

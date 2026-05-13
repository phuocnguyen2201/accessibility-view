/** sRGB channels in 0–255 (whole numbers). */
export type Rgb = { r: number; g: number; b: number };

const WCAG_AA_NORMAL_TEXT = 4.5;

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function relativeLuminance(rgb: Rgb): number {
  const linear = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG 2.1 contrast of two sRGB colors (order-independent). */
export function contrastRatioRgb(a: Rgb, b: Rgb): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const brightest = Math.max(L1, L2);
  const darkest = Math.min(L1, L2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function rgbToCssString(rgb: Rgb): string {
  return `rgb(${clamp255(rgb.r)}, ${clamp255(rgb.g)}, ${clamp255(rgb.b)})`;
}

function pad2(x: string): string {
  return x.length === 1 ? '0' + x : x;
}

/** Lowercase `#rrggbb` for fills and UI. */
export function rgbToHex(rgb: Rgb): string {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((v) => pad2(clamp255(v).toString(16)))
      .join('')
  );
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) {
    rp = c;
    gp = x;
  } else if (hue < 120) {
    rp = x;
    gp = c;
  } else if (hue < 180) {
    gp = c;
    bp = x;
  } else if (hue < 240) {
    gp = x;
    bp = c;
  } else if (hue < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: clamp255((rp + m) * 255),
    g: clamp255((gp + m) * 255),
    b: clamp255((bp + m) * 255),
  };
}

/**
 * Highest lightness in HSL (s fixed) such that `color` vs `background` ≥ minRatio.
 * Produces saturated, accessible foregrounds on light backgrounds (or dark fg on white).
 */
function maxLightnessForContrast(
  hue: number,
  saturation: number,
  background: Rgb,
  minRatio: number
): Rgb {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const rgb = hslToRgb(hue, saturation, mid);
    if (contrastRatioRgb(rgb, background) >= minRatio) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return hslToRgb(hue, saturation, lo);
}

/** Darkest acceptable HSL lightness (saturation fixed) with contrast ≥ minRatio on a dark background. */
function minLightnessForContrast(
  hue: number,
  saturation: number,
  background: Rgb,
  minRatio: number
): Rgb {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const rgb = hslToRgb(hue, saturation, mid);
    if (contrastRatioRgb(rgb, background) >= minRatio) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return hslToRgb(hue, saturation, hi);
}

function isLightBackground(rgb: Rgb): boolean {
  return relativeLuminance(rgb) > 0.179;
}

const DEFAULT_BACKGROUND: Rgb = { r: 255, g: 255, b: 255 };

/**
 * Five distinct sRGB colors. Each has at least 4.5:1 contrast against `background`
 * (default white), suitable for WCAG AA normal-sized text or equivalent UI emphasis.
 * On light backgrounds, colors are dark (high saturation, as light as possible while passing).
 * On dark backgrounds, colors are light (as dark as possible while passing).
 */
/**
 * @param hueOffsetDegrees — rotates the five base hues so "Generate" can vary the set (0–360).
 */
export function getAccessibleColorPattern(
  background: Rgb = DEFAULT_BACKGROUND,
  hueOffsetDegrees = 0
): Rgb[] {
  const baseHues = [0, 72, 144, 216, 288];
  const hues = baseHues.map((h) => (h + hueOffsetDegrees) % 360);
  const saturation = 0.88;
  if (isLightBackground(background)) {
    return hues.map((h) =>
      maxLightnessForContrast(h, saturation, background, WCAG_AA_NORMAL_TEXT)
    );
  }
  return hues.map((h) =>
    minLightnessForContrast(h, saturation, background, WCAG_AA_NORMAL_TEXT)
  );
}

export function getAccessibleColorPatternHexes(
  background: Rgb = DEFAULT_BACKGROUND,
  hueOffsetDegrees = 0
): string[] {
  return getAccessibleColorPattern(background, hueOffsetDegrees).map(rgbToHex);
}

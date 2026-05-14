/** sRGB channels in 0–255 (whole numbers). */
export type Rgb = { r: number; g: number; b: number };

/** WCAG 2.1 conformance level for contrast targets (SC 1.4.3 / 1.4.6). */
export type WcagLevel = 'AA' | 'AAA';

/** “Large” text per WCAG 2.1: 18pt+ regular, or 14pt+ bold (approx. 24px / 18.67px at default scaling). */
export type WcagTextSize = 'normal' | 'large';

export type WcagContrastTarget = { level: WcagLevel; textSize: WcagTextSize };

/**
 * Canonical keys for the four WCAG pattern UI options (AA/AAA × normal/large).
 * Use with {@link WCAG_PATTERN_PRESET_TARGETS} and {@link wcagContrastTargetFromPluginFields}.
 */
export const WCAG_PATTERN_PRESET_TARGETS = {
  'aa-normal': { level: 'AA' as const, textSize: 'normal' as const },
  'aa-large': { level: 'AA' as const, textSize: 'large' as const },
  'aaa-normal': { level: 'AAA' as const, textSize: 'normal' as const },
  'aaa-large': { level: 'AAA' as const, textSize: 'large' as const },
} as const satisfies Record<string, WcagContrastTarget>;

export type WcagPatternPresetKey = keyof typeof WCAG_PATTERN_PRESET_TARGETS;

/** Fields sent from the color-pattern UI / plugin message for resolving a {@link WcagContrastTarget}. */
export type WcagPatternTriggerFields = {
  preset?: string;
  wcagLevel?: string;
  textSize?: string;
};

/**
 * Resolves the WCAG contrast target from UI/plugin message fields.
 * Prefer `preset` (`aa-normal`, `aa-large`, `aaa-normal`, `aaa-large`); otherwise falls back to `wcagLevel` + `textSize`.
 */
export function wcagContrastTargetFromPluginFields(
  msg: WcagPatternTriggerFields
): WcagContrastTarget {
  const key = msg.preset?.trim().toLowerCase();
  if (key && key in WCAG_PATTERN_PRESET_TARGETS) {
    return WCAG_PATTERN_PRESET_TARGETS[key as WcagPatternPresetKey];
  }
  const level: WcagLevel =
    typeof msg.wcagLevel === 'string' && msg.wcagLevel.toUpperCase() === 'AAA'
      ? 'AAA'
      : 'AA';
  const textSize: WcagTextSize =
    typeof msg.textSize === 'string' && msg.textSize.toLowerCase() === 'large'
      ? 'large'
      : 'normal';
  return { level, textSize };
}

/**
 * Minimum contrast ratio for the given WCAG 2.1 target.
 * - SC 1.4.3 Contrast (Minimum), Level AA: normal 4.5:1, large 3:1
 * - SC 1.4.6 Contrast (Enhanced), Level AAA: normal 7:1, large 4.5:1
 */
export function wcag21MinContrastRatio(level: WcagLevel, textSize: WcagTextSize): number {
  if (level === 'AA') {
    return textSize === 'large' ? 3 : 4.5;
  }
  return textSize === 'large' ? 4.5 : 7;
}

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

/** WCAG 2.1 relative luminance contrast of two sRGB colors (order-independent). */
export function contrastRatioRgb(a: Rgb, b: Rgb): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const brightest = Math.max(L1, L2);
  const darkest = Math.min(L1, L2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/** True if `contrastRatioRgb(a, b)` meets the chosen WCAG 2.1 text contrast requirement. */
export function meetsWcag21Contrast(
  a: Rgb,
  b: Rgb,
  level: WcagLevel,
  textSize: WcagTextSize
): boolean {
  return contrastRatioRgb(a, b) >= wcag21MinContrastRatio(level, textSize);
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
    bp = c;
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

/** Reference UI background for “light theme” swatches (saturated colors readable on white). */
export const LIGHT_THEME_BACKGROUND: Rgb = { r: 255, g: 255, b: 255 };

/** Reference UI background for “dark theme” swatches (saturated colors readable on dark gray). */
export const DARK_THEME_BACKGROUND: Rgb = { r: 24, g: 26, b: 27 };

const DEFAULT_WCAG_TARGET: WcagContrastTarget = { level: 'AA', textSize: 'normal' };

/**
 * Five distinct sRGB colors. Each meets `contrastRatioRgb(color, background)` ≥ the WCAG 2.1
 * minimum for the chosen level and text size (default AA normal text: 4.5:1).
 *
 * @param hueOffsetDegrees — rotates the five base hues so "Generate" can vary the set (0–360).
 */
export function getAccessibleColorPattern(
  background: Rgb = DEFAULT_BACKGROUND,
  hueOffsetDegrees = 0,
  target: WcagContrastTarget = DEFAULT_WCAG_TARGET
): Rgb[] {
  const minRatio = wcag21MinContrastRatio(target.level, target.textSize);
  const baseHues = [0, 72, 144, 216, 288];
  const hues = baseHues.map((h) => (h + hueOffsetDegrees) % 360);
  const saturation = 0.88;
  if (isLightBackground(background)) {
    return hues.map((h) =>
      maxLightnessForContrast(h, saturation, background, minRatio)
    );
  }
  return hues.map((h) =>
    minLightnessForContrast(h, saturation, background, minRatio)
  );
}

export function getAccessibleColorPatternHexes(
  background: Rgb = DEFAULT_BACKGROUND,
  hueOffsetDegrees = 0,
  target: WcagContrastTarget = DEFAULT_WCAG_TARGET
): string[] {
  return getAccessibleColorPattern(background, hueOffsetDegrees, target).map(rgbToHex);
}

/** Two five-color sets: foregrounds for light UI vs dark UI backgrounds (same WCAG target and hue rotation). */
export type AccessibleColorPatternDual = {
  lightTheme: Rgb[];
  darkTheme: Rgb[];
};

export function getAccessibleColorPatternDual(
  hueOffsetDegrees = 0,
  target: WcagContrastTarget = DEFAULT_WCAG_TARGET
): AccessibleColorPatternDual {
  return {
    lightTheme: getAccessibleColorPattern(LIGHT_THEME_BACKGROUND, hueOffsetDegrees, target),
    darkTheme: getAccessibleColorPattern(DARK_THEME_BACKGROUND, hueOffsetDegrees, target),
  };
}

export function getAccessibleColorPatternDualHexes(
  hueOffsetDegrees = 0,
  target: WcagContrastTarget = DEFAULT_WCAG_TARGET
): { lightTheme: string[]; darkTheme: string[] } {
  const dual = getAccessibleColorPatternDual(hueOffsetDegrees, target);
  return {
    lightTheme: dual.lightTheme.map(rgbToHex),
    darkTheme: dual.darkTheme.map(rgbToHex),
  };
}

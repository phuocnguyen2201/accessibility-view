/**
 * Minimal persistence for color pairs saved from the contrast checker, plus
 * Palette Audit Mode: scoring every meaningful pair across a file's local
 * color styles once each is tagged with a role (text / background / accent
 * icon / surface). Reuses the WCAG contrast math from `color-pattern.ts`.
 */

import {
  contrastRatioRgb,
  hexToRgb,
  hslToRgb,
  maxLightnessForContrast,
  minLightnessForContrast,
  rgbToHex,
  rgbToHsl,
} from './color-pattern';

export type PaletteAuditMode = 'text' | 'ui-element';
export type PaletteTextSize = 'normal' | 'large';

export type PalettePair = {
  frameColor: string;
  textColor: string;
  contrast: number;
  mode: PaletteAuditMode;
  textSize: PaletteTextSize;
  savedAt: number;
};

const STORAGE_KEY = 'accessibility-view:palette-pairs';

export async function savePairToPalette(
  pair: Omit<PalettePair, 'savedAt'>
): Promise<PalettePair[]> {
  const existing = (await figma.clientStorage.getAsync(STORAGE_KEY)) as
    | PalettePair[]
    | undefined;
  const pairs = existing ?? [];
  pairs.push({ ...pair, savedAt: Date.now() });
  await figma.clientStorage.setAsync(STORAGE_KEY, pairs);
  return pairs;
}

export async function getSavedPalettePairs(): Promise<PalettePair[]> {
  const existing = (await figma.clientStorage.getAsync(STORAGE_KEY)) as
    | PalettePair[]
    | undefined;
  return existing ?? [];
}

export type ColorRole = 'text' | 'background' | 'accent-icon' | 'surface';
export const COLOR_ROLES: ColorRole[] = ['text', 'background', 'accent-icon', 'surface'];

export type PaletteColorEntry = {
  id: string;
  name: string;
  hex: string;
  role: ColorRole | null;
};

const ROLES_STORAGE_KEY = 'accessibility-view:palette-color-roles';

async function getRoleMap(): Promise<Record<string, ColorRole>> {
  const existing = (await figma.clientStorage.getAsync(ROLES_STORAGE_KEY)) as
    | Record<string, ColorRole>
    | undefined;
  return existing ?? {};
}

/** Tags (or clears, when `role` is null) the role of a local color style so it can appear in the audit matrix. */
export async function setColorRole(styleId: string, role: ColorRole | null): Promise<void> {
  const roles = await getRoleMap();
  if (role) {
    roles[styleId] = role;
  } else {
    delete roles[styleId];
  }
  await figma.clientStorage.setAsync(ROLES_STORAGE_KEY, roles);
}

function paintStyleToHex(style: PaintStyle): string | null {
  const solid = style.paints.find(
    (p): p is SolidPaint => p.type === 'SOLID' && p.visible !== false
  );
  if (!solid) return null;
  return rgbToHex({
    r: Math.round(solid.color.r * 255),
    g: Math.round(solid.color.g * 255),
    b: Math.round(solid.color.b * 255),
  });
}

/** All local solid-color paint styles, merged with any previously saved role tags. */
export async function getLocalPaletteColors(): Promise<PaletteColorEntry[]> {
  const [styles, roles] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    getRoleMap(),
  ]);
  const entries: PaletteColorEntry[] = [];
  for (const style of styles) {
    const hex = paintStyleToHex(style);
    if (!hex) continue;
    entries.push({ id: style.id, name: style.name, hex, role: roles[style.id] ?? null });
  }
  return entries;
}

export type PalettePairType = 'text' | 'non-text';

export type PaletteMatrixCell = {
  bgId: string;
  bgName: string;
  bgHex: string;
  fgId: string;
  fgName: string;
  fgHex: string;
  ratio: number;
  pairType: PalettePairType;
};

/**
 * Builds a background × foreground grid rather than a full N×N matrix: only role-based pairs
 * that could plausibly appear together (text/icon vs. background/surface) are scored, per the
 * scope controls in the project prospect.
 */
export function computePaletteMatrix(colors: PaletteColorEntry[]): PaletteMatrixCell[] {
  const backgrounds = colors.filter((c) => c.role === 'background' || c.role === 'surface');
  const foregrounds = colors.filter((c) => c.role === 'text' || c.role === 'accent-icon');

  const cells: PaletteMatrixCell[] = [];
  for (const bg of backgrounds) {
    for (const fg of foregrounds) {
      if (bg.id === fg.id) continue;
      const ratio = contrastRatioRgb(hexToRgb(fg.hex), hexToRgb(bg.hex));
      cells.push({
        bgId: bg.id,
        bgName: bg.name,
        bgHex: bg.hex,
        fgId: fg.id,
        fgName: fg.name,
        fgHex: fg.hex,
        ratio,
        pairType: fg.role === 'text' ? 'text' : 'non-text',
      });
    }
  }
  return cells;
}

/**
 * Up to 3 accessible alternatives for a failing pair's foreground color: a lighter and a darker
 * variant (same hue/saturation) that clear `minRatio` against the background, plus a
 * more-saturated variant of the darker one — "smart" adjustment instead of a random re-roll.
 */
export function suggestAccessibleFixes(cell: PaletteMatrixCell, minRatio: number): string[] {
  const fgRgb = hexToRgb(cell.fgHex);
  const bgRgb = hexToRgb(cell.bgHex);
  const { h, s } = rgbToHsl(fgRgb);

  const lighter = maxLightnessForContrast(h, s, bgRgb, minRatio);
  const darker = minLightnessForContrast(h, s, bgRgb, minRatio);
  const boostedSaturation = hslToRgb(h, Math.min(1, s + 0.2), rgbToHsl(darker).l);

  const suggestions = [lighter, darker, boostedSaturation].map(rgbToHex);
  return Array.from(new Set(suggestions)).filter(
    (hex) => hex.toLowerCase() !== cell.fgHex.toLowerCase()
  );
}

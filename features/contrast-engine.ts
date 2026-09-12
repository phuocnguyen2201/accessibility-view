/**
 * Shared color-resolution helpers for non-text contrast checking (WCAG 1.4.11)
 * and palette auditing: resolving a node's rendered color and the effective
 * background behind it, independent of how that color is ultimately used.
 */

import { type Rgb, contrastRatioRgb } from './color-pattern';

export type ResolvedColor = { rgb: Rgb; opacity: number };

function isVisiblePaint(paint: Paint): boolean {
  return paint.visible !== false && (paint.opacity ?? 1) > 0;
}

function solidPaintToRgb(paint: SolidPaint): Rgb {
  return {
    r: Math.round(paint.color.r * 255),
    g: Math.round(paint.color.g * 255),
    b: Math.round(paint.color.b * 255),
  };
}

function nodeOpacity(node: SceneNode): number {
  return 'opacity' in node && typeof node.opacity === 'number' ? node.opacity : 1;
}

/** First visible solid fill's color, alpha-combined with the paint's own opacity and the node's opacity. */
export function getEffectiveColor(node: SceneNode): ResolvedColor | null {
  if (!('fills' in node) || !Array.isArray(node.fills)) return null;
  const solid = node.fills.find(
    (p): p is SolidPaint => p.type === 'SOLID' && isVisiblePaint(p)
  );
  if (!solid) return null;
  return { rgb: solidPaintToRgb(solid), opacity: (solid.opacity ?? 1) * nodeOpacity(node) };
}

/** First visible solid stroke's color — used for borders and focus rings, which are drawn as strokes. */
export function getEffectiveStrokeColor(node: SceneNode): ResolvedColor | null {
  if (!('strokes' in node) || !Array.isArray(node.strokes)) return null;
  const solid = node.strokes.find(
    (p): p is SolidPaint => p.type === 'SOLID' && isVisiblePaint(p)
  );
  if (!solid) return null;
  return { rgb: solidPaintToRgb(solid), opacity: (solid.opacity ?? 1) * nodeOpacity(node) };
}

function hasVisibleNonSolidFill(node: SceneNode): boolean {
  if (!('fills' in node) || !Array.isArray(node.fills)) return false;
  return node.fills.some((p) => p.visible !== false && p.type !== 'SOLID');
}

function compositeOver(fg: Rgb, fgAlpha: number, bg: Rgb): Rgb {
  const a = Math.max(0, Math.min(1, fgAlpha));
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

/** Figma's default canvas/page background. */
const PAGE_BACKGROUND: Rgb = { r: 255, g: 255, b: 255 };

export type ResolvedBackground = { rgb: Rgb } | { unresolvable: true; reason: string };

/**
 * Walks up the parent chain compositing visible solid fills (outermost first) to find the
 * effective color behind a node. Any ancestor with a visible gradient/image fill makes the
 * true background unknowable from vector data alone, so that's reported rather than guessed.
 */
export function resolveBackground(node: SceneNode): ResolvedBackground {
  const ancestors: SceneNode[] = [];
  let current = node.parent;
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    ancestors.push(current as SceneNode);
    current = (current as SceneNode).parent;
  }

  let result = PAGE_BACKGROUND;
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (hasVisibleNonSolidFill(ancestor)) {
      return { unresolvable: true, reason: 'Gradient or image background behind this element' };
    }
    const color = getEffectiveColor(ancestor);
    if (color) {
      result = compositeOver(color.rgb, color.opacity, result);
    }
  }
  return { rgb: result };
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  return contrastRatioRgb(a, b);
}

/** Matches the `--decorative` layer-name suffix convention used to exempt decorative icons. */
const DECORATIVE_SUFFIX = /--decorative\s*$/i;
export function isDecorative(node: SceneNode): boolean {
  return DECORATIVE_SUFFIX.test(node.name.trim());
}

const DISABLED_NAME_PATTERN = /\bdisabled\b/i;

/** WCAG 1.4.11 exempts disabled UI controls; detected by name or a "disabled" component property. */
export function isDisabled(node: SceneNode): boolean {
  if (DISABLED_NAME_PATTERN.test(node.name)) return true;
  if (node.type === 'INSTANCE') {
    const props = node.componentProperties;
    for (const key of Object.keys(props)) {
      if (!/disabled/i.test(key)) continue;
      const prop = props[key];
      if (prop.type === 'BOOLEAN' && prop.value === true) return true;
      if (prop.type === 'VARIANT' && /disabled/i.test(String(prop.value))) return true;
    }
  }
  return false;
}

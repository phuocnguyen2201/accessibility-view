/**
 * WCAG 1.4.11 (Non-text Contrast) checker: finds icons, borders, and focus
 * indicators in a selection and scores each against its effective background.
 */

import { rgbToHex } from './color-pattern';
import {
  getEffectiveColor,
  getEffectiveStrokeColor,
  resolveBackground,
  contrastRatio,
  isDecorative,
  isDisabled,
} from './contrast-engine';

export type NonTextKind = 'icon' | 'border' | 'focus-indicator';
export type NonTextStatus = 'pass' | 'fail' | 'review';

export type NonTextResult = {
  nodeId: string;
  nodeName: string;
  kind: NonTextKind;
  foregroundHex: string | null;
  backgroundHex: string | null;
  ratio: number | null;
  status: NonTextStatus;
  reason?: string;
};

const NON_TEXT_THRESHOLD = 3;
const ICON_NAME_PATTERN = /^(icon\s*\/|ic-|icon-)/i;
const FOCUS_NAME_PATTERN = /\b(focus|ring|outline)\b/i;

function classify(node: SceneNode): NonTextKind | null {
  if (FOCUS_NAME_PATTERN.test(node.name)) return 'focus-indicator';
  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || ICON_NAME_PATTERN.test(node.name)) {
    return 'icon';
  }
  if ('strokes' in node && Array.isArray(node.strokes) && 'strokeWeight' in node) {
    const hasVisibleSolidStroke = node.strokes.some((s) => s.visible !== false && s.type === 'SOLID');
    const weight = node.strokeWeight;
    if (hasVisibleSolidStroke && typeof weight === 'number' && weight > 0) return 'border';
  }
  return null;
}

function evaluateNode(node: SceneNode, kind: NonTextKind): NonTextResult {
  const foreground =
    kind === 'icon'
      ? getEffectiveColor(node) ?? getEffectiveStrokeColor(node)
      : getEffectiveStrokeColor(node) ?? getEffectiveColor(node);

  const base = { nodeId: node.id, nodeName: node.name, kind };

  if (!foreground) {
    return {
      ...base,
      foregroundHex: null,
      backgroundHex: null,
      ratio: null,
      status: 'review',
      reason: 'No solid fill/stroke color found',
    };
  }

  const background = resolveBackground(node);
  if ('unresolvable' in background) {
    return {
      ...base,
      foregroundHex: rgbToHex(foreground.rgb),
      backgroundHex: null,
      ratio: null,
      status: 'review',
      reason: background.reason,
    };
  }

  const ratio = contrastRatio(foreground.rgb, background.rgb);
  return {
    ...base,
    foregroundHex: rgbToHex(foreground.rgb),
    backgroundHex: rgbToHex(background.rgb),
    ratio,
    status: ratio >= NON_TEXT_THRESHOLD ? 'pass' : 'fail',
  };
}

/** Traverses the given root nodes (and their descendants), skipping decorative/disabled candidates. */
export function runNonTextContrastCheck(roots: readonly SceneNode[]): NonTextResult[] {
  const results: NonTextResult[] = [];
  const seen = new Set<string>();

  function visit(node: SceneNode) {
    const kind = classify(node);
    if (kind && !seen.has(node.id) && !isDecorative(node) && !isDisabled(node)) {
      seen.add(node.id);
      results.push(evaluateNode(node, kind));
    }
    if ('children' in node) {
      for (const child of node.children) visit(child as SceneNode);
    }
  }

  for (const root of roots) visit(root);
  return results;
}

export async function selectAndZoomToNode(nodeId: string): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || !('absoluteBoundingBox' in node)) return;
  const sceneNode = node as SceneNode;
  figma.currentPage.selection = [sceneNode];
  figma.viewport.scrollAndZoomIntoView([sceneNode]);
}

const BADGE_LAYER_NAME = 'A11y Non-Text Contrast Badges';

const BADGE_COLOR_BY_STATUS: Record<NonTextStatus, RGB> = {
  pass: { r: 0.13, g: 0.7, b: 0.2 },
  fail: { r: 0.82, g: 0.16, b: 0.16 },
  review: { r: 0.93, g: 0.66, b: 0.06 },
};

export function clearNonTextBadges(): void {
  const existing = figma.currentPage.findOne(
    (n) => n.name === BADGE_LAYER_NAME && n.type === 'GROUP'
  );
  if (existing) existing.remove();
}

/** Drops a small colored dot at the top-right of every checked node, grouped for easy toggling. */
export async function showNonTextBadges(results: NonTextResult[]): Promise<void> {
  clearNonTextBadges();
  const dots: EllipseNode[] = [];

  for (const result of results) {
    const node = await figma.getNodeByIdAsync(result.nodeId);
    if (!node || !('absoluteBoundingBox' in node)) continue;
    const box = (node as SceneNode).absoluteBoundingBox;
    if (!box) continue;

    const dot = figma.createEllipse();
    dot.resize(10, 10);
    dot.x = box.x + box.width - 8;
    dot.y = box.y - 2;
    dot.fills = [{ type: 'SOLID', color: BADGE_COLOR_BY_STATUS[result.status] }];
    dot.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    dot.strokeWeight = 1;
    dot.name = `badge: ${result.nodeName}`;
    dots.push(dot);
  }

  if (dots.length === 0) return;
  const group = figma.group(dots, figma.currentPage);
  group.name = BADGE_LAYER_NAME;
  group.locked = true;
  group.expanded = false;
}

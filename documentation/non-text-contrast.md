# Non-Text Contrast Checker

Scans a selection for icons, borders, and focus indicators and scores each against WCAG 1.4.11 (Non-text Contrast) — a flat **3:1** minimum against whatever is actually behind it, not just the parent's own fill.

## How to use

1. Select one or more nodes (a whole frame works — the check recurses into every descendant).
2. Open the plugin → **Non-Text Contrast Checker**.
3. Results are grouped into **Fail / Needs review / Pass**, each row showing the node name, kind, and ratio. Click a row to select and zoom to that node on canvas.
4. **Re-check selection** re-runs the scan (e.g. after you've fixed something or changed the selection).
5. **Show badges on canvas** drops a small colored dot (green/red/amber) at the top-right corner of every checked node, grouped under a locked layer named `A11y Non-Text Contrast Badges` so it's easy to find and delete; unchecking the toggle removes it.

### Exempting a layer

- **Decorative icons**: suffix the layer name with `--decorative` (case-insensitive) to exclude it, mirroring HTML's alt-text exemption for decorative images.
- **Disabled controls**: WCAG 1.4.11 exempts disabled UI — a node is treated as disabled if its name contains "disabled" (case-insensitive) or it's a component instance with a boolean/variant property whose name contains "disabled" and whose value is truthy/`"disabled"`.

## How it works

`features/contrast-engine.ts` — shared color resolution, also usable by future checks:

- `getEffectiveColor(node)` / `getEffectiveStrokeColor(node)` — first visible `SOLID` fill/stroke, alpha-combined from the paint's own opacity and the node's `opacity`.
- `resolveBackground(node)` — walks the parent chain outermost-first, alpha-compositing each ancestor's solid fill over a running result (starting from white, Figma's default canvas color). If any ancestor has a visible non-`SOLID` fill (gradient/image), returns `{ unresolvable: true, reason }` instead of guessing.
- `isDecorative(node)` / `isDisabled(node)` — the exemption checks described above.

`features/non-text-contrast.ts`:

- `classify(node)` — a node is a **focus indicator** if its name matches `/focus|ring|outline/i`; an **icon** if it's a `VECTOR`/`BOOLEAN_OPERATION` or named like `icon/…`, `ic-…`, `icon-…`; a **border** if it has a visible solid stroke with `strokeWeight > 0`. Focus indicators/borders are evaluated against their stroke color; icons against their fill (falling back to stroke either way if the primary one is missing).
- `runNonTextContrastCheck(roots)` — recurses through the given root nodes, classifies and de-duplicates candidates, skips decorative/disabled ones, and returns one `NonTextResult` per candidate: `pass` (≥3:1), `fail` (<3:1), or `review` (no resolvable color, e.g. missing fill or a gradient/image background).
- `selectAndZoomToNode(nodeId)` / `showNonTextBadges(results)` / `clearNonTextBadges()` — canvas-side actions driven by the results panel; both use `figma.getNodeByIdAsync` since the manifest's `documentAccess` is `"dynamic-page"`.

## Message contract

| Message | Direction | Payload | Purpose |
|---|---|---|---|
| `MESSAGE.VIEW.NON_TEXT_CONTRAST` | UI → plugin | — | Open this view; runs the check on the current selection |
| `MESSAGE.NON_TEXT_CONTRAST.RUN` | UI → plugin | — | Re-run the check on the current selection |
| `MESSAGE.NON_TEXT_CONTRAST.RESULTS` | plugin → UI | `results: NonTextResult[]` | Results to render |
| `MESSAGE.NON_TEXT_CONTRAST.SELECT_NODE` | UI → plugin | `nodeId` | Select + zoom to a node |
| `MESSAGE.NON_TEXT_CONTRAST.TOGGLE_BADGES` | UI → plugin | `show: boolean` | Show/clear the canvas badge overlay |

## Known limitations

- Detection is heuristic (name patterns + node type), not semantic — a `VECTOR` used purely as decoration but without the `--decorative` suffix will still be flagged, and an icon built as a `FRAME`/`GROUP` of shapes rather than a `VECTOR`/`BOOLEAN_OPERATION` won't be detected unless it follows the `icon/`, `ic-`, `icon-` naming convention.
- Gradient/image backgrounds are always reported as "needs review" rather than pixel-sampled (the prospect doc's M3 milestone — exporting the node and reading canvas pixels — isn't implemented).
- Blend modes other than normal alpha compositing aren't modeled in `resolveBackground`.
- No auto re-check on selection change (unlike the Color Contrast checker) — use **Re-check selection** after changing what's selected.

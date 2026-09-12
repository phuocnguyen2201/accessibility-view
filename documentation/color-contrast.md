# Color Contrast Checker

Checks the text/background (or UI-element) contrast ratio of a selected frame against WCAG 2.1 thresholds, and lets you adjust either color live to fix failures.

## How to use

1. Select a **frame** on the canvas (works best when it contains one `TEXT` child).
2. Open the plugin → **Check Color Contrast**.
3. The panel reads the frame's fill as the background color and its first text child's fill as the foreground color, and shows the ratio.
4. Toggle **Text** vs **UI element** mode:
   - Text mode also lets you pick **Normal** vs **Large (18pt+)** text size, and shows AA/AAA pass/fail against 4.5:1/7:1 (normal) or 3:1/4.5:1 (large).
   - UI element mode checks a flat 3:1 threshold (WCAG 1.4.11 non-text contrast).
5. Use the color pickers to adjust either color — changes are applied to the frame/text on canvas immediately, and the ratio recalculates live.
6. Use **Swap colors** to flip foreground/background, and the copy buttons to copy either hex to your clipboard.
7. Click **Save pair to palette** to persist the current pair (see [Saved pairs](#saved-pairs) below).

While this view is open, changing your canvas selection to a different frame automatically re-runs the check on it (`figma.on("selectionchange")`, gated by an internal `pageIsOpening` flag that's set when this view opens and cleared on **Back**).

## How it works

`features/color-contrast.ts`:

- `checkContrast(selection: SceneNode)` — reads the frame's first `SOLID` fill as background and its first `TEXT` child's first `SOLID` fill as foreground (falling back to black/white), computes the ratio, and posts `MESSAGE.RES_CONTRAST` back to the UI.
- `checkContrastWithOnChangeColors(frameColor, textColor)` — same calculation from two hex strings, used when the user edits a color picker.
- `applyNewColorsToTheFrame(selection, frameColor, textColor)` — writes the new hex colors back onto the frame's fill and/or its `TEXT` children's fills.
- Contrast math (`luminance`, `getContrastRatio`, `getWcagLevels`) is a private, self-contained implementation of the WCAG 2.1 relative-luminance formula — it does **not** share code with `features/color-pattern.ts`'s equivalent functions (`contrastRatioRgb`, `relativeLuminance`), so a fix to one won't automatically apply to the other.

Only `SOLID` fills are read; gradient/image fills fall back to the black/white defaults.

## Saved pairs (`features/palette-audit.ts`)

`SAVE_PALETTE_PAIR` persists `{ frameColor, textColor, contrast, mode, textSize, savedAt }` to `figma.clientStorage` under the key `accessibility-view:palette-pairs` via `savePairToPalette` / `getSavedPalettePairs`. This is separate from [Palette Audit Mode](palette-audit.md) (which audits local color *styles*, not ad-hoc saved pairs) — there's currently no UI to browse these saved pairs back.

## Message contract

| Message | Direction | Payload | Purpose |
|---|---|---|---|
| `MESSAGE.VIEW.COLOR_CONTRAST` | UI → plugin | — | Open this view; auto-checks the current selection if it's a single frame |
| `MESSAGE.RES_CONTRAST` | plugin → UI | `frameColor, textColor, contrast, levels` | Result to render |
| `MESSAGE.CHANGE_COLOR` | UI → plugin | `colorType, value, frameColor?, textColor?` | A color picker changed; recompute + apply |
| `MESSAGE.SWAP` | UI → plugin | `frameColor, textColor` | Swap fg/bg and re-apply |
| `MESSAGE.SAVE_PALETTE_PAIR` | UI → plugin | `frameColor, textColor, contrast, mode, textSize` | Persist the pair |
| `MESSAGE.SHOW_TOAST` | UI → plugin | `message` | Show a `figma.notify` toast (used for "copied to clipboard") |
| `MESSAGE.BACK` | UI → plugin | — | Return to the main menu |

## Known limitations

- Only the frame's own fill and its *direct* text children are inspected — text nested in a group/component inside the frame isn't picked up.
- Gradient/image backgrounds aren't resolved; the check silently falls back to black/white.
- `MESSAGE.CHECK_CONTRAST` (distinct from `MESSAGE.VIEW.COLOR_CONTRAST`) is defined in constants but not wired to any button — dead code left over from an earlier flow.

# AI Color Pattern Generator

Generates five distinct, WCAG-conformant accent colors at once — one set tuned for light UI backgrounds, one for dark — so you always get a usable, accessible palette instead of a random one that might fail contrast.

> Despite the name (kept from the original UI), this doesn't call an external AI/API — it's a deterministic HSL search. See [Known limitations](#known-limitations).

## How to use

1. Open the plugin → **Color Pattern**.
2. Pick a WCAG target: **AA/AAA × Normal/Large** (defaults to AA Normal, 4.5:1).
3. Two columns of 5 swatches render: **Light theme** (colors that pass the target against a white background) and **Dark theme** (colors that pass against a near-black background, `#181A1B`).
4. Click **Generate** to re-roll with a new random hue rotation (same target, same 5-hue spacing).
5. Click any swatch to apply that color as the fill of the last frame/text you had selected (sent as `frameColor` regardless of node type — see [Known limitations](#known-limitations)).
6. Changing the WCAG target re-scores the *current* hue rotation instead of re-rolling — so you can flip between AA/AAA without losing the palette you're looking at.

## How it works

`features/color-pattern.ts` is the shared WCAG/color-math module — also reused by [Palette Audit Mode](palette-audit.md)'s suggest-fix feature:

- `wcag21MinContrastRatio(level, textSize)` — the four WCAG 2.1 thresholds (4.5 / 3 / 7 / 4.5).
- `contrastRatioRgb(a, b)` — standard relative-luminance contrast ratio.
- `getAccessibleColorPatternDual(hueOffsetDegrees, target)` — takes 5 evenly-spaced base hues (0°, 72°, 144°, 216°, 288°) rotated by `hueOffsetDegrees`, and for each hue binary-searches HSL lightness (`maxLightnessForContrast` / `minLightnessForContrast`) at fixed saturation (0.88) until the color just clears the target ratio against the light or dark reference background. This guarantees every generated color is accessible **by construction** rather than by filtering random colors.
- `rgbToHex` / `hexToRgb` / `rgbToHsl` / `hslToRgb` — shared color-space conversions also used by `contrast-engine.ts` and `palette-audit.ts`.
- `wcagContrastTargetFromPluginFields(msg)` — resolves a `{level, textSize}` target from either a `preset` key (`aa-normal`, `aa-large`, `aaa-normal`, `aaa-large`) or separate `wcagLevel`/`textSize` fields, for backward compatibility with older message shapes.

`src/code.ts` keeps one piece of state, `colorPatternHueOffset`, so "change WCAG target" and "Generate" can share the same `postColorPatternPalette` path but differ in whether the hue offset is re-randomized.

## Message contract

| Message | Direction | Payload | Purpose |
|---|---|---|---|
| `MESSAGE.VIEW.AI_PATTERN` | UI → plugin | — | Open this view; resets hue offset to 0 |
| `MESSAGE.WCAG_PATTERN_TARGET` | UI → plugin | `preset` | Re-score the current hue rotation at a new WCAG target |
| `MESSAGE.GENERATE` | UI → plugin | `preset` | Pick a new random hue rotation at the given target |
| `MESSAGE.COLOR_PATTERN_PALETTE` | plugin → UI | `lightTheme: string[5], darkTheme: string[5]` | Hex colors to render |
| `MESSAGE.NOTIFY` | UI → plugin | `frameColor` | Apply a clicked swatch to the current selection |
| `MESSAGE.BACK` | UI → plugin | — | Return to the main menu |

## Known limitations

- **Clicking a swatch on a selection with text children throws at runtime.** The swatch click only ever sends `frameColor` (`views/color-pattern.html`'s `buttonOnClick`); `src/code.ts`'s `NOTIFY`/`SWAP` handler then calls `applyNewColorsToTheFrame(selection, frameColor, msg.textColor ?? '')`, passing `''` — not `undefined` — for the color it never received. `applyNewColorsToTheFrame`'s guard is `textColor !== undefined`, which is true for `''`, so it proceeds to `hexToRgb('')` and produces `NaN` RGB channels for any `TEXT` node (a `TEXT` selection itself, or a `FRAME`'s `TEXT` children), which Figma's `fills` setter rejects. In practice: clicking a swatch is only safe when the current selection is a `FRAME` with no `TEXT` children, or a non-text, non-frame node (where nothing happens).
- Colors are picked at a fixed saturation (0.88); the search only varies lightness, so the resulting 5 hues always look similarly vivid.
- No caching/animation — clicking Generate discards the previous palette immediately (no undo besides re-Generate).

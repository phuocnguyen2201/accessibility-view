# Palette Audit Mode

Scores every meaningful pair across a file's local color styles at once, so a bad pairing is caught before it's ever placed on canvas — the "shift-left" value the [project prospect](../accessibility-view-project-prospect.md) describes.

## How to use

1. Create local **color styles** in the file (Fill → "+" next to a color → save as style). The audit only reads styles, not ad-hoc layer fills.
2. Open the plugin → **Palette Audit**.
3. Under **Local color styles**, tag each one with a role: **Text**, **Background**, **Accent / Icon**, or **Surface** (leave "Untagged" to exclude it).
4. The **Matrix** below populates once you have at least one *Background/Surface* color and one *Text/Accent-Icon* color tagged — rows are backgrounds/surfaces, columns are text/accent-icon colors, and each cell is their contrast ratio.
5. Pick a **text pair target** (AA/AAA × Normal/Large) — this only affects cells where the column color is tagged **Text**; **Accent/Icon** columns are always checked against the fixed 3:1 non-text threshold regardless of this toggle.
6. Click a **failing (red) cell** to get up to 3 "smart" fix suggestions — hue/saturation-preserving lightness adjustments to the foreground color that would pass. Click a suggested swatch to copy its hex.
7. Check **Failures only** to hide passing cells, and **Export CSV** to download the full matrix (respecting the current WCAG target, ignoring the failures-only filter) as `palette-audit.csv` for design-system documentation.

Role tags are saved per-file via `figma.clientStorage`, so reopening the plugin later remembers them.

## How it works

`features/palette-audit.ts`:

- `getLocalPaletteColors()` — reads `figma.getLocalPaintStylesAsync()`, extracts each style's first visible `SOLID` paint as a hex color, and merges in any previously saved role from `clientStorage` (`accessibility-view:palette-color-roles`, styleId → role). Styles with no solid paint (gradient/image-only) are skipped.
- `setColorRole(styleId, role)` — persists (or clears) one style's role tag.
- `computePaletteMatrix(colors)` — deliberately **not** a full N×N grid: it only pairs `background`/`surface`-tagged colors (rows) against `text`/`accent-icon`-tagged colors (columns), per the prospect doc's scope-control guidance. A `text`-role column is a `'text'` pair type; `accent-icon` is `'non-text'`.
- `suggestAccessibleFixes(cell, minRatio)` — extracts the failing foreground's hue/saturation (`rgbToHsl`), then reuses `color-pattern.ts`'s binary-search helpers (`maxLightnessForContrast`, `minLightnessForContrast`) to find a lighter and a darker variant that clear `minRatio` against the background, plus a more-saturated variant of the darker one — up to 3 unique, hue-preserving alternatives (never a random re-roll).

Pass/fail thresholds and CSV export are computed **client-side** in `views/palette-audit.html` from the raw ratios the backend sends, so switching the AA/AAA/Normal/Large toggle re-renders instantly without a round trip.

## Message contract

| Message | Direction | Payload | Purpose |
|---|---|---|---|
| `MESSAGE.VIEW.PALETTE_AUDIT` | UI → plugin | — | Open this view; sends colors + matrix |
| `MESSAGE.PALETTE_AUDIT.GET_COLORS` | UI → plugin | — | Re-fetch colors + matrix |
| `MESSAGE.PALETTE_AUDIT.COLORS` | plugin → UI | `colors: PaletteColorEntry[], matrix: PaletteMatrixCell[]` | Data to render |
| `MESSAGE.PALETTE_AUDIT.SET_ROLE` | UI → plugin | `styleId, role` | Tag/untag a color's role (triggers a `COLORS` refresh) |
| `MESSAGE.PALETTE_AUDIT.SUGGEST_FIX` | UI → plugin | `fgId, bgId, minRatio` | Request fix suggestions for one failing cell |
| `MESSAGE.PALETTE_AUDIT.SUGGESTIONS` | plugin → UI | `fgId, bgId, suggestions: string[]` | Suggested hex alternatives |

## Known limitations (and deliberate scope cuts)

- **Figma Variables aren't supported**, only local Paint Styles — the prospect doc's open question #2 was resolved in favor of styles for simplicity; adding variable-collection support would mean a second `getLocalPaletteColors`-equivalent reading `figma.variables.*`.
- **No native-Figma-frame export** — CSV only (open question #3), so a matrix can't be dropped onto the canvas as documentation the way a Figma frame could.
- **No `background`-vs-`background` or `text`-vs-`text` pairing** — matches the doc's stated goal of avoiding a nonsensical/unreadable full grid, but also means, e.g., two background colors used adjacently (a card on a page) aren't audited.
- Role tags are stored by **style id**, so deleting and recreating a color style with the same name loses its tag.
- Suggestions only adjust the **foreground**; there's no option to instead suggest adjusting the background, and no way to apply a suggestion directly to the color style (copy-to-clipboard only).

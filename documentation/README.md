# Accessibility View — Feature Documentation

Technical reference for each feature in the plugin: what it does, how to use it in Figma, and how it's implemented. See the top-level [README.md](../README.md) for install/build instructions.

| Feature | Docs | Source |
|---|---|---|
| Color Contrast Checker | [color-contrast.md](color-contrast.md) | `features/color-contrast.ts`, `views/color-contrast.html` |
| Vision Simulation | [vision-simulation.md](vision-simulation.md) | `features/vision-simulation.ts`, `views/vision_simulation.html` |
| AI Color Pattern Generator | [color-pattern.md](color-pattern.md) | `features/color-pattern.ts`, `views/color-pattern.html` |
| Non-Text Contrast Checker | [non-text-contrast.md](non-text-contrast.md) | `features/non-text-contrast.ts`, `features/contrast-engine.ts`, `views/non-text-contrast.html` |
| Palette Audit Mode | [palette-audit.md](palette-audit.md) | `features/palette-audit.ts`, `views/palette-audit.html` |

## Shared architecture

All features follow the same pattern:

1. **`src/code.ts`** is the plugin's main-thread entry point. It calls `figma.showUI(...)` to swap in a view's HTML, and `figma.ui.onmessage` dispatches incoming UI messages (`msg.type`) to feature functions.
2. **`constants/constants.ts`** defines every message `type` string as a `MESSAGE.*` constant, plus window titles and notification text. Each view's `<script>` keeps a local copy of the relevant `MESSAGE` keys (Figma UI iframes can't `import` the TS source), so **the string values must be kept in sync by hand** when a message name changes.
3. **`features/*.ts`** hold the actual logic (Figma node traversal, color math, `clientStorage` persistence) and have no UI code — they're unit-testable in isolation from the plugin runtime.
4. **`views/*.html`** are standalone HTML documents (one per plugin window) built by `webpack.config.js` into `dist/*.html` and registered in `manifest.json`'s `ui` map. Each posts `{ pluginMessage: { type, ...data } }` to the parent via `parent.postMessage` and listens for responses on `window.onmessage`.

`documentAccess` in `manifest.json` is `"dynamic-page"`, so any lookup of a node by id (rather than one already in hand from `figma.currentPage.selection`) must go through the async `figma.getNodeByIdAsync`, not the sync `figma.getNodeById`.

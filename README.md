# Dither Studio

Turn anything on your Drawdy board into a halftone: select it, open Dither Studio, tune the dots or pixels in a live preview, then place the result back on the board as an image.

## How to use

1. Select one or more elements on the board, then click the nine-dot Dither Studio button on the right of the board, or right-click and choose **Dither Studio…**.
2. The panel opens with a snapshot of your selection, drawn as a dot field. With nothing selected, the panel asks you to select something and click again; you can also drop or paste an image into it.
3. Shape the result on the right:
   - **Style**: Dots (marks inside each cell) or Pixels (whole cells). In Pixels, **Colour** picks one ink or the source's own colours.
   - **Dither**: Floyd–Steinberg, Bayer 4, Bayer 8, Blue noise or Hard.
   - **Shape**: circle or square dots.
   - **Polarity**: Dark subject or Light subject. It is set for you from the image's brightness each time a new image comes in.
   - Sliders for grid (cells across), cell size, dot size, vignette, posterize, levels (Pixels only), gamma, floor, ceiling and softness.
   - **Ink** and **Paper** colours: a swatch or any colour you pick.
   - **Reset** goes back to the defaults; the line next to it counts cells and dots.
4. Pick an **Export size** (1x or 2x, at most 2048 px on the longest side), then:
   - **Place beside** puts the image 40 px to the right of the selection, as wide as the selection.
   - **Replace selection** puts it where the selection was and removes the selected elements. It is only on for a selection from the board.
   If the panel was opened with nothing selected, the image lands in the middle of your view, 480 px wide.
5. What lands on the board is one PNG image element. The board then moves to it. Press Escape to close the panel.

Your settings are remembered for next time; the export size is not.

## Good to know

- The panel loads nothing from the network. The snapshot comes from the board and every dot is drawn in the panel itself.
- Settings are saved with Drawdy's extension storage (`kv-storage`) a moment after you change them, and come back the next time the extension starts.
- Dither Studio is adapted from dotscreen, a personal project of the author.

## Licence

This extension's code is [MIT](LICENSE).

## Development

```bash
npm install
npm test
npm run typecheck
npm run dev          # dev server on :5189; in Drawdy run ⌘K → "Add extension dev server" on a local board
npm run build        # regenerates src/webview-html.ts and dist/*.drawdyx
npm run preflight    # before submitting: committed, built, pushed, under Drawdy's limits, above the live version
```

Drawdy builds published versions from this repository's `src/index.ts`, so commit `src/webview-html.ts` after `npm run build`. Bump `driverVersion` in `manifest.json` for every release and add it to `CHANGELOG.md`. `npm test` holds the manifest and listing files to Drawdy's submission rules (a description of at most 500 characters, an icon of at most 256 KB, only `@drawdy/driver-protocol` imported from outside the repository).

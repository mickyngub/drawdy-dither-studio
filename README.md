# Dither Studio

Turn an image into a halftone on your Drawdy board: upload it to Dither Studio, tune the dots or pixels in a live preview, then place the result on the board as an image.

## How to use

1. Click the Dither Studio button (white dots on a blue-to-red tile) on the right of the board.
2. Click **Upload image** and pick an image file, or drop or paste one into the panel. Until you do, the preview shows a sample shape and **Place on board** stays off.
3. Shape the result on the right:
   - **Style**: Dots (marks inside each cell) or Pixels (whole cells). In Pixels, **Colour** picks one ink or the source's own colours.
   - **Dither**: Floyd–Steinberg, Bayer 4, Bayer 8, Blue noise or Hard.
   - **Shape**: circle or square dots.
   - **Polarity**: Dark subject or Light subject. It is set for you from the image's brightness each time a new image comes in.
   - Sliders for grid (cells across), cell size, dot size, vignette, posterize, levels (Pixels only), gamma, floor, ceiling and softness.
   - **Ink** and **Paper** colours: a swatch or any colour you pick.
   - **Reset** goes back to the defaults; the line next to it counts cells and dots.
4. Pick an **Export size** (1x or 2x, at most 2048 px on the longest side), then click **Place on board**. The image lands in the middle of your view, 480 px wide.
5. What lands on the board is one PNG image element. The board then moves to it. Upload another image any time to start again. Press Escape to close the panel.

Your settings are remembered for next time; the export size is not.

## Good to know

- The panel loads nothing from the network. Your image stays in the panel, every dot is drawn there, and only the finished PNG goes onto the board.
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

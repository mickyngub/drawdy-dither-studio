// Adapted from dotscreen, a personal project of the repo author.

import { sourceSize } from "./source";
import { makeTone, makeVignette } from "./tone";
import type { InkField, Params, SourceEl } from "../types";

let scratch: HTMLCanvasElement | null = null;

/**
 * Source pixels to per-cell dot appetite.
 *
 * Order matters: normalise, then levels, then gamma, then posterize, and the
 * vignette last so it always wins at the frame edge. That trailing knockout is
 * what makes the form float on the paper instead of filling a rectangle.
 */
export function buildInk(el: SourceEl, p: Params): InkField {
    const src = sourceSize(el);
    const w = Math.max(8, Math.round(p.grid));
    const h = Math.max(8, Math.round((w * src.h) / src.w));

    scratch ??= document.createElement("canvas");
    scratch.width = w;
    scratch.height = h;
    const g = scratch.getContext("2d", { willReadFrequently: true })!;
    // The ground must be the value that yields no dots, or a blur bleeds ink in
    // from the frame edge. Which value that is depends on polarity.
    g.fillStyle = p.invert ? "#000" : "#fff";
    g.fillRect(0, 0, w, h);
    g.save();
    g.filter = p.blur ? `blur(${p.blur}px)` : "none";
    g.drawImage(el, 0, 0, w, h);
    g.restore();
    g.filter = "none";
    const px = g.getImageData(0, 0, w, h).data;

    const raw = new Float32Array(w * h);
    let lo = 1;
    let hi = 0;
    for (let i = 0, q = 0; i < raw.length; i++, q += 4) {
        const l = (0.299 * px[q] + 0.587 * px[q + 1] + 0.114 * px[q + 2]) / 255;
        raw[i] = l;
        if (l < lo) lo = l;
        if (l > hi) hi = l;
    }
    const span = Math.max(1e-4, hi - lo);

    const tone = makeTone(p);
    const vig = makeVignette(p, w, h);
    const data = new Float32Array(w * h);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            data[i] = tone((raw[i] - lo) / span) * vig(x, y);
        }
    }
    // Colour mode needs the pixels themselves, untouched by the tone pipeline.
    // A copy, not the ImageData: the scratch canvas is reused on the next build.
    const rgb =
        p.style === "pixel" && p.colour ? new Uint8ClampedArray(px) : undefined;
    return { data, w, h, rgb };
}

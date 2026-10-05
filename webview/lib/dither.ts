// Adapted from dotscreen, a personal project of the repo author.

import { B4, B8 } from "./bayer";
import { BN64 } from "./bluenoise";
import { clamp01 } from "./tone";
import type { DitherMode, InkField, Params } from "../types";

const matrix = (m: DitherMode) => (m === "b4" ? B4 : m === "b8" ? B8 : BN64);

/**
 * Ordered quantise to a shade index. Written as floor plus a threshold on the
 * remainder rather than the usual floor(v * top + M), because at two levels that
 * is exactly the `v > M` the dot field has always made: the same image has to
 * keep producing the same mask.
 */
function quant(v: number, top: number, m: number): number {
    const q = v * top;
    const f = Math.floor(q);
    return f >= top ? top : f + (q - f > m ? 1 : 0);
}

/**
 * Shade index per cell, 0..levels-1. At the default two levels this is the dot
 * field's one-bit mask.
 */
export function dither(field: InkField, p: Params, levels = 2): Uint8Array {
    const { data, w, h } = field;
    const n = w * h;
    const out = new Uint8Array(n);
    const top = Math.max(1, levels - 1);

    if (p.dither === "fs") {
        // The buffer carries diffused error, so it leaves 0..1; only the decision is
        // clamped, never the value the error is measured against.
        const buf = new Float32Array(n);
        for (let i = 0; i < n; i++) buf[i] = data[i];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x;
                const old = buf[i];
                const nv = Math.round(clamp01(old) * top);
                out[i] = nv;
                const e = old - nv / top;
                if (x + 1 < w) buf[i + 1] += e * 0.4375;
                if (y + 1 < h) {
                    if (x > 0) buf[i + w - 1] += e * 0.1875;
                    buf[i + w] += e * 0.3125;
                    if (x + 1 < w) buf[i + w + 1] += e * 0.0625;
                }
            }
        }
        return out;
    }

    if (p.dither === "thr") {
        for (let i = 0; i < n; i++) out[i] = Math.round(clamp01(data[i]) * top);
        return out;
    }

    const M = matrix(p.dither);
    const s = M.length;
    for (let y = 0; y < h; y++) {
        const row = M[y % s];
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            out[i] = quant(clamp01(data[i]), top, row[x % s]);
        }
    }
    return out;
}

/**
 * Shade index per channel, w*h*3, straight off the source pixels. Colour mode
 * dithers the image's own colours, so none of the luminance pipeline applies
 * here: no polarity, no floor/ceiling, no posterize, no vignette. Gamma is the
 * one knob that still means something on a colour, so it is the one kept.
 *
 * Null when the field carries no pixels. The caller falls back to the mono ramp.
 */
export function ditherColour(field: InkField, p: Params): Uint8Array | null {
    const rgb = field.rgb;
    if (!rgb) return null;
    const { w, h } = field;
    const n = w * h;
    const out = new Uint8Array(n * 3);
    const top = Math.max(1, p.levels - 1);
    const gam = p.gamma;

    if (p.dither === "fs") {
        const bufs = [
            new Float32Array(n),
            new Float32Array(n),
            new Float32Array(n),
        ];
        for (let c = 0; c < 3; c++) {
            const buf = bufs[c];
            for (let i = 0; i < n; i++)
                buf[i] = Math.pow(rgb[i * 4 + c] / 255, gam);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const i = y * w + x;
                    const old = buf[i];
                    const nv = Math.round(clamp01(old) * top);
                    out[i * 3 + c] = nv;
                    const e = old - nv / top;
                    if (x + 1 < w) buf[i + 1] += e * 0.4375;
                    if (y + 1 < h) {
                        if (x > 0) buf[i + w - 1] += e * 0.1875;
                        buf[i + w] += e * 0.3125;
                        if (x + 1 < w) buf[i + w + 1] += e * 0.0625;
                    }
                }
            }
        }
        return out;
    }

    if (p.dither === "thr") {
        for (let i = 0; i < n; i++) {
            for (let c = 0; c < 3; c++) {
                out[i * 3 + c] = Math.round(
                    clamp01(Math.pow(rgb[i * 4 + c] / 255, gam)) * top
                );
            }
        }
        return out;
    }

    const M = matrix(p.dither);
    const s = M.length;
    for (let y = 0; y < h; y++) {
        const row = M[y % s];
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            // One threshold for all three channels. Thresholding them independently
            // scatters the error into colour fringes instead of into texture.
            const m = row[x % s];
            for (let c = 0; c < 3; c++) {
                out[i * 3 + c] = quant(
                    clamp01(Math.pow(rgb[i * 4 + c] / 255, gam)),
                    top,
                    m
                );
            }
        }
    }
    return out;
}

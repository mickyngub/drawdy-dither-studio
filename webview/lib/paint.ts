// Adapted from dotscreen, a personal project of the repo author.

import type { InkField, Params } from "../types";

const TAU = Math.PI * 2;

/**
 * Every dot goes into one Path2D and fills in a single call. Filling per dot
 * costs about two orders of magnitude more, which matters at 40k cells.
 */
export function paint(
    canvas: HTMLCanvasElement,
    mask: Uint8Array,
    field: InkField,
    p: Params,
    scale = 1
): number {
    const { w, h } = field;
    const cell = p.cell * scale;
    const g = canvas.getContext("2d")!;
    // Assigning width/height resets the context, so touch them only when the size
    // actually changed.
    if (canvas.width !== w * cell) canvas.width = w * cell;
    if (canvas.height !== h * cell) canvas.height = h * cell;
    g.fillStyle = p.paper;
    g.fillRect(0, 0, canvas.width, canvas.height);

    const r = Math.min(p.dot * scale, cell) / 2;

    const path = new Path2D();
    let live = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!mask[y * w + x]) continue;
            const px = x * cell + cell / 2;
            const py = y * cell + cell / 2;
            if (p.shape === "square") path.rect(px - r, py - r, r * 2, r * 2);
            else {
                path.moveTo(px + r, py);
                path.arc(px, py, r, 0, TAU);
            }
            live++;
        }
    }

    g.fillStyle = p.ink;
    g.fill(path);
    return live;
}

function frame(
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
    p: Params,
    scale: number
) {
    const cell = p.cell * scale;
    const g = canvas.getContext("2d")!;
    if (canvas.width !== w * cell) canvas.width = w * cell;
    if (canvas.height !== h * cell) canvas.height = h * cell;
    g.fillStyle = p.paper;
    g.fillRect(0, 0, canvas.width, canvas.height);
    return { g, cell };
}

/** '#rgb' or '#rrggbb' to components. Anything unparseable reads as black. */
function hex(s: string): [number, number, number] {
    let v = s.trim().replace("#", "");
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    const n = parseInt(v, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** k of the way from a to b, as a css colour. */
function mix(a: string, b: string, k: number): string {
    const ca = hex(a);
    const cb = hex(b);
    const c = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * k);
    return `rgb(${c(0)},${c(1)},${c(2)})`;
}

/**
 * Pixel style: whole cells, not marks in cells, so shape and dot size say
 * nothing here. One Path2D per shade and one fill each, at most seven fills
 * however many cells there are.
 */
export function paintPixel(
    canvas: HTMLCanvasElement,
    shades: Uint8Array,
    field: InkField,
    p: Params,
    scale = 1
): number {
    const { w, h } = field;
    const { g, cell } = frame(canvas, w, h, p, scale);
    const top = Math.max(1, p.levels - 1);
    const paths: Path2D[] = [];
    for (let s = 0; s <= top; s++) paths.push(new Path2D());
    let live = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const s = shades[y * w + x];
            // Shade 0 is paper, already laid down.
            if (!s) continue;
            paths[s > top ? top : s].rect(x * cell, y * cell, cell, cell);
            live++;
        }
    }

    for (let s = 1; s <= top; s++) {
        g.fillStyle = mix(p.paper, p.ink, s / top);
        g.fill(paths[s]);
    }
    return live;
}

/**
 * The same squares, carrying the source's own colours. Cells quantise onto at
 * most levels^3 distinct colours, so they are bucketed by colour and each bucket
 * fills once: the per-cell fill this avoids is the same trap as the dot field's.
 */
export function paintPixelColour(
    canvas: HTMLCanvasElement,
    chan: Uint8Array,
    field: InkField,
    p: Params,
    scale = 1
): number {
    const { w, h } = field;
    const { g, cell } = frame(canvas, w, h, p, scale);
    const L = Math.max(2, p.levels);
    const top = L - 1;
    const buckets = new Map<number, Path2D>();

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 3;
            const key = (chan[i] * L + chan[i + 1]) * L + chan[i + 2];
            let path = buckets.get(key);
            if (!path) buckets.set(key, (path = new Path2D()));
            path.rect(x * cell, y * cell, cell, cell);
        }
    }

    for (const [key, path] of buckets) {
        const b = key % L;
        const gr = ((key - b) / L) % L;
        const r = Math.floor(key / (L * L));
        g.fillStyle = `rgb(${Math.round((255 * r) / top)},${Math.round((255 * gr) / top)},${Math.round((255 * b) / top)})`;
        g.fill(path);
    }
    return w * h;
}

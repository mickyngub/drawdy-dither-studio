import { dither, ditherColour } from "./lib/dither";
import { buildInk } from "./lib/ink";
import { paint, paintPixel, paintPixelColour } from "./lib/paint";
import { sourceSize } from "./lib/source";
import type { InkField, Params, Source } from "./types";

const MAX_EXPORT_SIDE = 2048;

export interface Readout {
    w: number;
    h: number;
    dots: number;
}

export interface ExportedPng {
    dataUrl: string;
    width: number;
    height: number;
}

interface Ready {
    field: InkField;
    mask: Uint8Array | null;
    chan: Uint8Array | null;
}

const inkKey = (p: Params, s: Source | null): string =>
    [
        s?.id,
        p.grid,
        p.lo,
        p.hi,
        p.gamma,
        p.posterize,
        p.vig,
        p.blur,
        p.invert,
        p.style,
        p.colour,
    ].join("|");

const maskKey = (p: Params): string =>
    [p.dither, p.levels, p.style, p.colour].join("|");

function quantise(
    field: InkField,
    p: Params
): { mask: Uint8Array | null; chan: Uint8Array | null } {
    if (p.style !== "pixel") return { mask: dither(field, p), chan: null };
    const chan = p.colour ? ditherColour(field, p) : null;
    return chan
        ? { mask: null, chan }
        : { mask: dither(field, p, p.levels), chan: null };
}

function draw(
    canvas: HTMLCanvasElement,
    r: Ready,
    p: Params,
    scale = 1
): number {
    if (r.chan) return paintPixelColour(canvas, r.chan, r.field, p, scale);
    if (p.style === "pixel")
        return paintPixel(canvas, r.mask!, r.field, p, scale);
    return paint(canvas, r.mask!, r.field, p, scale);
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(blob);
    });
}

export class DitherStudioEngine {
    private canvas: HTMLCanvasElement;
    private params: Params;
    private source: Source | null = null;
    private onReadout: (readout: Readout) => void;

    private field: InkField | null = null;
    private mask: Uint8Array | null = null;
    private chan: Uint8Array | null = null;
    private ink = "";
    private ditherKey = "";
    private raf = 0;
    private readout: Readout = { w: 0, h: 0, dots: 0 };

    constructor(
        canvas: HTMLCanvasElement,
        params: Params,
        onReadout: (readout: Readout) => void
    ) {
        this.canvas = canvas;
        this.params = params;
        this.onReadout = onReadout;
    }

    setParams(params: Params): void {
        this.params = params;
    }

    setSource(source: Source | null): void {
        this.source = source;
    }

    getSource(): Source | null {
        return this.source;
    }

    render(): void {
        if (this.raf) {
            cancelAnimationFrame(this.raf);
            this.raf = 0;
        }
        const ready = this.sync();
        if (!ready) return;
        const dots = draw(this.canvas, ready, this.params);
        const prev = this.readout;
        if (
            prev.dots === dots &&
            prev.w === ready.field.w &&
            prev.h === ready.field.h
        ) {
            return;
        }
        this.readout = { w: ready.field.w, h: ready.field.h, dots };
        this.onReadout(this.readout);
    }

    requestRender(): void {
        if (this.raf) return;
        this.raf = requestAnimationFrame(() => {
            this.raf = 0;
            this.render();
        });
    }

    async exportPng(scale: number): Promise<ExportedPng | null> {
        const ready = this.sync();
        if (!ready) return null;
        const p = this.params;
        const baseW = ready.field.w * p.cell;
        const baseH = ready.field.h * p.cell;
        const longest = Math.max(baseW, baseH, 1);
        const capped = Math.max(
            0.05,
            Math.min(scale, MAX_EXPORT_SIDE / longest)
        );
        const target = document.createElement("canvas");
        draw(target, ready, p, capped);
        const blob = await new Promise<Blob | null>((resolve) =>
            target.toBlob((b) => resolve(b), "image/png")
        );
        if (!blob) return null;
        return {
            dataUrl: await blobToDataUrl(blob),
            width: target.width,
            height: target.height,
        };
    }

    private sync(): Ready | null {
        const p = this.params;
        const s = this.source;
        if (!s) return null;
        const size = sourceSize(s.el);
        if (!size.w || !size.h) return null;

        const ik = inkKey(p, s);
        if (ik !== this.ink || !this.field || s.live) {
            this.field = buildInk(s.el, p);
            this.ink = ik;
            this.mask = null;
            this.chan = null;
        }

        const mk = maskKey(p);
        if ((!this.mask && !this.chan) || this.ditherKey !== mk) {
            const q = quantise(this.field, p);
            this.mask = q.mask;
            this.chan = q.chan;
            this.ditherKey = mk;
        }
        return {
            field: this.field,
            mask: this.mask,
            chan: this.chan,
        };
    }
}

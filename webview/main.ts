import type { DriverToWebview, WebviewToDriver } from "../src/shared/messages";
import { DitherStudioEngine, type Readout } from "./engine";
import {
    COLOURWAYS,
    COLOUR_MODES,
    DEFAULTS,
    DITHERS,
    POLARITIES,
    SHAPES,
    SLIDERS,
    STYLES,
} from "./lib/presets";
import { autoPolarity } from "./lib/polarity";
import { proceduralBlob } from "./lib/procedural";
import {
    fillSegmented,
    makeColourRow,
    makeRule,
    makeSegmented,
    makeSlider,
} from "./ui";
import type {
    ColourMode,
    DitherMode,
    DotShape,
    Params,
    Polarity,
    RenderStyle,
    Source,
} from "./types";
import type { SegmentedControl, SliderControl } from "./ui";

type DrawdyWebviewApi = {
    postMessage(message: unknown, transfer?: Transferable[]): void;
    onMessage(listener: (message: unknown) => void): () => void;
};

declare function acquireDrawdyApi(): DrawdyWebviewApi;

const PARAMS_DEBOUNCE_MS = 400;
const NO_SELECTION_HINT =
    "Select something on the board, then click Dither Studio. Or drop an image here.";

const api = acquireDrawdyApi();

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const stage = document.getElementById("stage") as HTMLDivElement;
const hint = document.getElementById("hint") as HTMLDivElement;
const hintText = document.getElementById("hint-text") as HTMLSpanElement;
const panel = document.getElementById("panel") as HTMLElement;
const statusLine = document.getElementById("status") as HTMLSpanElement;
const exportSeg = document.getElementById("export-scale") as HTMLDivElement;
const besideButton = document.getElementById(
    "place-beside"
) as HTMLButtonElement;
const replaceButton = document.getElementById(
    "place-replace"
) as HTMLButtonElement;

let params: Params = { ...DEFAULTS };
let exportScale = 1;
let boardSource = false;
let sourceCount = 0;
let paramsTimer = 0;

function send(message: WebviewToDriver): void {
    api.postMessage(message);
}

function queueParams(): void {
    if (paramsTimer) clearTimeout(paramsTimer);
    paramsTimer = setTimeout(() => {
        paramsTimer = 0;
        send({
            type: "params",
            params: params as unknown as Record<string, unknown>,
        });
    }, PARAMS_DEBOUNCE_MS) as unknown as number;
}

function setStatus(text: string, tone: "" | "good" | "bad" = ""): void {
    statusLine.textContent = text;
    statusLine.className = `status grow${tone ? ` ${tone}` : ""}`;
}

function setHint(text: string | null): void {
    if (text === null) {
        hint.hidden = true;
        return;
    }
    hintText.textContent = text;
    hint.hidden = false;
}

const readoutLine = document.createElement("span");
const resetButton = document.createElement("button");

function showReadout(readout: Readout): void {
    readoutLine.textContent = `${readout.w} × ${
        readout.h
    } cells · ${readout.dots.toLocaleString()} dots`;
}

const engine = new DitherStudioEngine(canvas, params, showReadout);

const controls: {
    sliders: Partial<Record<string, SliderControl>>;
    style: SegmentedControl<RenderStyle> | null;
    colour: SegmentedControl<ColourMode> | null;
    dither: SegmentedControl<DitherMode> | null;
    shape: SegmentedControl<DotShape> | null;
    invert: SegmentedControl<Polarity> | null;
    ink: { set(value: string): void } | null;
    paper: { set(value: string): void } | null;
} = {
    sliders: {},
    style: null,
    colour: null,
    dither: null,
    shape: null,
    invert: null,
    ink: null,
    paper: null,
};

function applyDerivedState(): void {
    controls.sliders.levels?.setDim(params.style !== "pixel");
    controls.colour?.setHidden(params.style !== "pixel");
}

function commit(next: Partial<Params>, persist = true): void {
    params = { ...params, ...next };
    engine.setParams(params);
    applyDerivedState();
    engine.requestRender();
    if (persist) queueParams();
}

function pushControls(): void {
    for (const spec of SLIDERS) {
        controls.sliders[spec.key]?.set(params[spec.key]);
    }
    controls.style?.set(params.style);
    controls.colour?.set(params.colour);
    controls.dither?.set(params.dither);
    controls.shape?.set(params.shape);
    controls.invert?.set(params.invert);
    controls.ink?.set(params.ink);
    controls.paper?.set(params.paper);
    applyDerivedState();
}

function buildPanel(): void {
    const head = document.createElement("div");
    head.className = "readout";
    readoutLine.textContent = "0 × 0 cells · 0 dots";
    resetButton.type = "button";
    resetButton.textContent = "Reset";
    resetButton.addEventListener("click", () => {
        params = { ...DEFAULTS };
        engine.setParams(params);
        pushControls();
        engine.requestRender();
        queueParams();
    });
    head.appendChild(readoutLine);
    head.appendChild(resetButton);
    panel.appendChild(head);

    controls.style = makeSegmented<RenderStyle>(
        panel,
        "Style",
        STYLES,
        params.style,
        (style) => commit({ style })
    );
    controls.colour = makeSegmented<ColourMode>(
        panel,
        "Colour",
        COLOUR_MODES,
        params.colour,
        (colour) => commit({ colour })
    );
    controls.dither = makeSegmented<DitherMode>(
        panel,
        "Dither",
        DITHERS,
        params.dither,
        (mode) => commit({ dither: mode })
    );
    controls.shape = makeSegmented<DotShape>(
        panel,
        "Shape",
        SHAPES,
        params.shape,
        (shape) => commit({ shape })
    );
    controls.invert = makeSegmented<Polarity>(
        panel,
        "Polarity",
        POLARITIES,
        params.invert,
        (invert) => commit({ invert })
    );

    makeRule(panel);

    for (const spec of SLIDERS) {
        controls.sliders[spec.key] = makeSlider(
            panel,
            spec,
            params[spec.key],
            (value) => commit({ [spec.key]: value } as Partial<Params>)
        );
    }

    makeRule(panel);

    const colourway = Object.keys(COLOURWAYS).map((key) => COLOURWAYS[key]);
    controls.ink = makeColourRow(panel, "Ink", colourway, params.ink, (ink) =>
        commit({ ink })
    );
    controls.paper = makeColourRow(
        panel,
        "Paper",
        ["#ffffff", "#f5f1e8", "#111111"],
        params.paper,
        (paper) => commit({ paper })
    );
}

function buildFooter(): void {
    fillSegmented<number>(
        exportSeg,
        [
            [1, "1x"],
            [2, "2x"],
        ],
        exportScale,
        (scale) => {
            exportScale = scale;
        }
    );
    besideButton.addEventListener("click", () => void place("beside"));
    replaceButton.addEventListener("click", () => void place("replace"));
}

async function place(mode: "beside" | "replace"): Promise<void> {
    if (!engine.getSource()) {
        setStatus("Nothing to place yet.", "bad");
        return;
    }
    setStatus("Rendering…");
    besideButton.disabled = true;
    replaceButton.disabled = true;
    try {
        const png = await engine.exportPng(exportScale);
        if (!png) {
            setStatus("The render could not be encoded.", "bad");
            return;
        }
        send({
            type: "place",
            dataUrl: png.dataUrl,
            pixelWidth: png.width,
            pixelHeight: png.height,
            mode,
        });
        setStatus("Placing…");
    } finally {
        besideButton.disabled = false;
        replaceButton.disabled = !boardSource;
    }
}

function mergeParams(raw: unknown): Params {
    const merged: Record<string, unknown> = { ...DEFAULTS };
    if (raw && typeof raw === "object") {
        const defaults = DEFAULTS as unknown as Record<string, unknown>;
        for (const [key, value] of Object.entries(
            raw as Record<string, unknown>
        )) {
            if (!(key in defaults)) continue;
            if (typeof value !== typeof defaults[key]) continue;
            merged[key] = value;
        }
    }
    return merged as unknown as Params;
}

function adoptSource(el: HTMLCanvasElement, fromBoard: boolean): void {
    sourceCount += 1;
    const source: Source = {
        id: `dither-studio-${sourceCount}-${Date.now()}`,
        name: fromBoard ? "selection" : "dropped image",
        el,
    };
    engine.setSource(source);
    commit({ invert: autoPolarity(el) }, false);
    controls.invert?.set(params.invert);
    boardSource = fromBoard;
    replaceButton.disabled = !fromBoard;
    setHint(null);
}

async function adoptBlob(blob: Blob, fromBoard: boolean): Promise<void> {
    const bitmap = await createImageBitmap(blob);
    const target = document.createElement("canvas");
    target.width = bitmap.width;
    target.height = bitmap.height;
    const context = target.getContext("2d");
    if (!context) return;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    adoptSource(target, fromBoard);
}

function imageFileFrom(items: DataTransfer | null): File | null {
    if (!items) return null;
    for (const file of Array.from(items.files)) {
        if (file.type.startsWith("image/")) return file;
    }
    return null;
}

function wireDropAndPaste(): void {
    const over = (event: DragEvent) => {
        event.preventDefault();
        stage.classList.add("dragover");
    };
    stage.addEventListener("dragover", over);
    stage.addEventListener("dragenter", over);
    stage.addEventListener("dragleave", () =>
        stage.classList.remove("dragover")
    );
    stage.addEventListener("drop", (event) => {
        event.preventDefault();
        stage.classList.remove("dragover");
        const file = imageFileFrom(event.dataTransfer);
        if (!file) return;
        setStatus("");
        void adoptBlob(file, false);
    });
    document.addEventListener("paste", (event) => {
        const file = imageFileFrom(event.clipboardData);
        if (!file) return;
        event.preventDefault();
        setStatus("");
        void adoptBlob(file, false);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        send({ type: "close" });
    });
}

function handle(message: DriverToWebview): void {
    switch (message.type) {
        case "init": {
            params = mergeParams(message.params);
            engine.setParams(params);
            pushControls();
            engine.requestRender();
            return;
        }
        case "source": {
            setStatus("");
            void adoptBlob(message.png, true).then(() => engine.render());
            return;
        }
        case "no-selection": {
            boardSource = false;
            replaceButton.disabled = true;
            setHint(NO_SELECTION_HINT);
            return;
        }
        case "placed": {
            setStatus("Placed on the board.", "good");
            return;
        }
        case "error": {
            setStatus(message.message, "bad");
            return;
        }
    }
}

buildPanel();
buildFooter();
wireDropAndPaste();
pushControls();
engine.setSource({
    id: "dither-studio-placeholder",
    name: "placeholder",
    el: proceduralBlob(),
});
setHint(NO_SELECTION_HINT);
engine.render();

api.onMessage((raw) => {
    if (!raw || typeof raw !== "object") return;
    handle(raw as DriverToWebview);
});

send({ type: "ready" });

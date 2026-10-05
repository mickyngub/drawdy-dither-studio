// Adapted from dotscreen, a personal project of the repo author.

import type {
    ColourMode,
    DitherMode,
    DotShape,
    Params,
    Polarity,
    RenderStyle,
} from "../types";

export const DEFAULTS: Params = {
    grid: 200,
    cell: 8,
    dot: 5,
    lo: 0.02,
    hi: 0.98,
    gamma: 1,
    posterize: 6,
    vig: 0.45,
    blur: 0,
    style: "dots",
    levels: 4,
    colour: 0,
    dither: "fs",
    shape: "circle",
    invert: 0,
    ink: "#6b7fc4",
    paper: "#ffffff",
};

export type SliderKey =
    | "grid"
    | "cell"
    | "dot"
    | "vig"
    | "posterize"
    | "levels"
    | "gamma"
    | "lo"
    | "hi"
    | "blur";

export interface SliderSpec {
    key: SliderKey;
    label: string;
    min: number;
    max: number;
    step: number;
    /** Cheap knobs only change how the mask is drawn, so the ink field survives. */
    cheap?: boolean;
}

export const SLIDERS: SliderSpec[] = [
    { key: "grid", label: "Grid (cells across)", min: 40, max: 420, step: 1 },
    {
        key: "cell",
        label: "Cell size (px)",
        min: 3,
        max: 24,
        step: 1,
        cheap: true,
    },
    {
        key: "dot",
        label: "Dot size (px)",
        min: 1,
        max: 24,
        step: 1,
        cheap: true,
    },
    { key: "vig", label: "Vignette", min: 0, max: 1, step: 0.01 },
    {
        key: "posterize",
        label: "Posterize (0 = off)",
        min: 0,
        max: 10,
        step: 1,
    },
    {
        key: "levels",
        label: "Levels (pixel style)",
        min: 2,
        max: 8,
        step: 1,
        cheap: true,
    },
    { key: "gamma", label: "Gamma", min: 0.3, max: 3, step: 0.05 },
    { key: "lo", label: "Floor", min: 0, max: 0.9, step: 0.01 },
    { key: "hi", label: "Ceiling", min: 0.1, max: 1, step: 0.01 },
    { key: "blur", label: "Softness", min: 0, max: 4, step: 0.25 },
];

export const DITHERS: [DitherMode, string][] = [
    ["fs", "Floyd–Steinberg"],
    ["b4", "Bayer 4"],
    ["b8", "Bayer 8"],
    ["bn", "Blue noise"],
    ["thr", "Hard"],
];
export const STYLES: [RenderStyle, string][] = [
    ["dots", "Dots"],
    ["pixel", "Pixels"],
];
export const COLOUR_MODES: [ColourMode, string][] = [
    [0, "Ink"],
    [1, "Source"],
];
export const SHAPES: [DotShape, string][] = [
    ["circle", "Circle"],
    ["square", "Square"],
];
export const POLARITIES: [Polarity, string][] = [
    [0, "Dark subject"],
    [1, "Light subject"],
];

export const COLOURWAYS: Record<string, string> = {
    periwinkle: "#6b7fc4",
    indigo: "#3b4fa8",
    graphite: "#3a3a3a",
    oxblood: "#8c3b46",
    moss: "#5a7a52",
};

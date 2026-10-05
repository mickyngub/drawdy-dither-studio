import type { SliderSpec } from "./lib/presets";

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    parent?: HTMLElement
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
}

const decimals = (step: number): number =>
    (String(step).split(".")[1] ?? "").length;

export type SliderControl = {
    set(value: number): void;
    setDim(dim: boolean): void;
};

export function makeSlider(
    parent: HTMLElement,
    spec: SliderSpec,
    initial: number,
    onInput: (value: number) => void
): SliderControl {
    const wrap = el("div", "field", parent);
    const head = el("div", "field-head", wrap);
    const label = el("label", undefined, head);
    label.textContent = spec.label;
    const value = el("span", "value", head);
    const input = el("input", undefined, wrap);
    input.type = "range";
    input.min = String(spec.min);
    input.max = String(spec.max);
    input.step = String(spec.step);
    const places = decimals(spec.step);

    const show = (v: number) => {
        value.textContent = v.toFixed(places);
    };
    input.value = String(initial);
    show(initial);

    input.addEventListener("input", () => {
        const v = Number(input.value);
        show(v);
        onInput(v);
    });

    return {
        set(v) {
            input.value = String(v);
            show(v);
        },
        setDim(dim) {
            wrap.classList.toggle("dim", dim);
        },
    };
}

export type SegmentedControl<T> = {
    set(value: T): void;
    setHidden(hidden: boolean): void;
};

export function fillSegmented<T extends string | number>(
    row: HTMLElement,
    options: [T, string][],
    initial: T,
    onPick: (value: T) => void
): (value: T) => void {
    const buttons = options.map(([value, text]) => {
        const button = el("button", undefined, row);
        button.type = "button";
        button.textContent = text;
        button.addEventListener("click", () => {
            paint(value);
            onPick(value);
        });
        return { value, button };
    });

    const paint = (current: T) => {
        for (const entry of buttons) {
            entry.button.classList.toggle("on", entry.value === current);
        }
    };
    paint(initial);
    return paint;
}

export function makeSegmented<T extends string | number>(
    parent: HTMLElement,
    label: string | null,
    options: [T, string][],
    initial: T,
    onPick: (value: T) => void
): SegmentedControl<T> {
    const wrap = el("div", "field", parent);
    if (label) {
        const head = el("div", "field-head", wrap);
        const text = el("label", undefined, head);
        text.textContent = label;
    }
    const row = el("div", "seg", wrap);
    const paint = fillSegmented(row, options, initial, onPick);
    return {
        set: paint,
        setHidden(hidden) {
            wrap.hidden = hidden;
        },
    };
}

export type ColourControl = {
    set(value: string): void;
};

export function makeColourRow(
    parent: HTMLElement,
    label: string,
    swatches: string[],
    initial: string,
    onPick: (value: string) => void
): ColourControl {
    const wrap = el("div", "field", parent);
    const head = el("div", "field-head", wrap);
    const text = el("label", undefined, head);
    text.textContent = label;
    const row = el("div", "swatches", wrap);

    const buttons = swatches.map((colour) => {
        const button = el("button", "swatch", row);
        button.type = "button";
        button.style.background = colour;
        button.title = colour;
        button.addEventListener("click", () => {
            apply(colour);
            onPick(colour);
        });
        return { colour, button };
    });

    const picker = el("input", undefined, row);
    picker.type = "color";
    picker.value = initial;
    picker.addEventListener("input", () => {
        apply(picker.value);
        onPick(picker.value);
    });

    const apply = (colour: string) => {
        picker.value = colour;
        for (const entry of buttons) {
            entry.button.classList.toggle(
                "on",
                entry.colour.toLowerCase() === colour.toLowerCase()
            );
        }
    };
    apply(initial);

    return { set: apply };
}

export function makeRule(parent: HTMLElement): void {
    el("div", "rule", parent);
}

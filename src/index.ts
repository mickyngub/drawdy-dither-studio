import type {
    DriverCommandIssuer,
    DriverManifest,
    DriverModule,
    ModuleStyling,
} from "@drawdy/driver-protocol";
import type { DriverToWebview, Rect, WebviewToDriver } from "./shared/messages";
import { WEBVIEW_HTML } from "./webview-html";

// Drawdy shows this through <img>, where currentColor is black, so the colours are explicit.
const ACTION_BUTTON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18"><rect x="1" y="1" width="22" height="22" rx="6" fill="#698CF9"/><g fill="#ffffff" transform="translate(12 12) scale(0.72) translate(-12 -12)"><circle cx="5" cy="5" r="1.1"/><circle cx="12" cy="5" r="1.9"/><circle cx="19" cy="5" r="1.1"/><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="3.1"/><circle cx="19" cy="12" r="1.9"/><circle cx="5" cy="19" r="1.1"/><circle cx="12" cy="19" r="1.9"/><circle cx="19" cy="19" r="1.1"/></g></svg>`;

const PARAMS_KV_KEY = "params";
const PLACE_WIDTH = 480;
const FLY_DURATION_MS = 350;

let requestId = 0;

let driver: {
    manifest: DriverManifest;
    issueCommand: DriverCommandIssuer;
    generateId: () => string;
    styling: ModuleStyling;
    actionButtonId: string;
    webviewId: string;
    webviewHtml: string | null;
    webviewOpen: boolean;
    params: Record<string, unknown> | null;
} | null = null;

let chain: Promise<void> = Promise.resolve();

const nextRequestId = (): string => String(requestId++);

function stylingCssVars(styling: ModuleStyling): string {
    return Object.entries(styling)
        .map(([key, value]) =>
            key === "theme"
                ? `color-scheme: ${value};`
                : `--drawdy-${key.replace(
                      /[A-Z]/g,
                      (c) => `-${c.toLowerCase()}`
                  )}: ${value};`
        )
        .join("");
}

function enqueue(task: () => Promise<void>): Promise<void> {
    const next = chain.then(task).catch(() => undefined);
    chain = next;
    return next;
}

function post(message: DriverToWebview): void {
    if (!driver) return;
    void driver.issueCommand({
        type: "command:webview:post-message",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { webviewDomId: driver.webviewId, message },
    });
}

export const activate: DriverModule["activate"] = async ({
    manifest,
    issueCommand,
    styling,
    generateId,
}) => {
    driver = {
        manifest,
        issueCommand,
        generateId,
        styling,
        actionButtonId: `${manifest.driverId}:action-button`,
        webviewId: `${manifest.driverId}:webview`,
        webviewHtml: null,
        webviewOpen: false,
        params: null,
    };
    const { driverId } = manifest;

    const created = await issueCommand({
        type: "command:dom:create-action-button",
        driverId,
        requestId: nextRequestId(),
        req: { domElementId: driver.actionButtonId, svg: ACTION_BUTTON_SVG },
    });
    if (created.res.error !== undefined) return;

    await Promise.all([
        issueCommand({
            type: "subscription:dom:element-clicked",
            driverId,
            requestId: nextRequestId(),
            req: { domElementId: driver.actionButtonId },
        }),
        issueCommand({
            type: "subscription:webview:message",
            driverId,
            requestId: nextRequestId(),
            req: { webviewDomId: driver.webviewId },
        }),
        issueCommand({
            type: "subscription:dom:theme-changed",
            driverId,
            requestId: nextRequestId(),
        }),
    ]);

    const stored = await issueCommand({
        type: "command:kv-storage:get",
        driverId,
        requestId: nextRequestId(),
        req: { key: PARAMS_KV_KEY },
    });
    if (driver && stored.res.error === undefined) {
        const restored = stored.res.value?.got?.[PARAMS_KV_KEY];
        if (restored && typeof restored === "object") {
            driver.params = restored as Record<string, unknown>;
        }
    }
};

export const onEvent: DriverModule["onEvent"] = async (event) => {
    if (!driver) return;
    switch (event.type) {
        case "subscription:dom:element-clicked": {
            if (event.body.domElementId !== driver.actionButtonId) return;
            await enqueue(openWebview);
            return;
        }
        case "subscription:webview:message": {
            if (event.body.webviewDomId !== driver.webviewId) return;
            const message = event.body.message;
            if (typeof message !== "object" || message === null) return;
            await handleWebviewMessage(message as WebviewToDriver);
            return;
        }
        case "subscription:dom:theme-changed": {
            driver.styling = event.body.styling;
            if (!driver.webviewOpen) driver.webviewHtml = null;
            return;
        }
        default: {
            return;
        }
    }
};

async function openWebview(): Promise<void> {
    if (!driver) return;
    if (driver.webviewHtml === null) {
        driver.webviewHtml = WEBVIEW_HTML.replace(
            "/*__DRAWDY_STYLING__*/",
            stylingCssVars(driver.styling)
        );
    }
    await driver.issueCommand({
        type: "command:webview:create",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            webviewDomId: driver.webviewId,
            htmlContent: driver.webviewHtml,
            keepStateWhenClosed: true,
        },
    });
    if (driver) driver.webviewOpen = true;
}

async function handleWebviewMessage(message: WebviewToDriver): Promise<void> {
    if (!driver) return;
    switch (message.type) {
        case "ready": {
            driver.webviewOpen = true;
            post({ type: "init", params: driver.params ?? undefined });
            return;
        }
        case "params": {
            const params = message.params;
            if (typeof params !== "object" || params === null) return;
            driver.params = params;
            await driver.issueCommand({
                type: "command:kv-storage:set",
                driverId: driver.manifest.driverId,
                requestId: nextRequestId(),
                req: {
                    key: PARAMS_KV_KEY,
                    payload: { [PARAMS_KV_KEY]: params },
                },
            });
            return;
        }
        case "place": {
            await enqueue(() =>
                place(message.dataUrl, message.pixelWidth, message.pixelHeight)
            );
            return;
        }
        case "close": {
            driver.webviewOpen = false;
            await driver.issueCommand({
                type: "command:webview:hide",
                driverId: driver.manifest.driverId,
                requestId: nextRequestId(),
                req: { webviewDomId: driver.webviewId },
            });
            return;
        }
    }
}

async function viewCentredRect(width: number, height: number): Promise<Rect> {
    if (!driver) return { x: 0, y: 0, width, height };
    const res = await driver.issueCommand({
        type: "command:camera:get-viewport-rect",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
    });
    if (res.res.error !== undefined) return { x: 0, y: 0, width, height };
    const { rect } = res.res.value;
    return {
        x: rect.x + (rect.width - width) / 2,
        y: rect.y + (rect.height - height) / 2,
        width,
        height,
    };
}

async function place(
    dataUrl: string,
    pixelWidth: number,
    pixelHeight: number
): Promise<void> {
    if (!driver) return;
    if (
        typeof dataUrl !== "string" ||
        !dataUrl.startsWith("data:image/") ||
        !(pixelWidth > 0) ||
        !(pixelHeight > 0)
    ) {
        post({ type: "error", message: "That render could not be read." });
        return;
    }

    const width = PLACE_WIDTH;
    const height = width * (pixelHeight / pixelWidth);
    const { x, y } = await viewCentredRect(width, height);
    if (!driver) return;

    const drawdyElementId = driver.generateId();
    const added = await driver.issueCommand({
        type: "command:scene:add-drawdy-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            elements: [
                {
                    type: "image",
                    drawdyElementId,
                    url: dataUrl,
                    x,
                    y,
                    width,
                    height,
                    meta: {
                        [driver.manifest.driverId]: { at: Date.now() },
                    },
                },
            ],
        },
    });
    if (!driver) return;
    if (added.res.error !== undefined) {
        post({ type: "error", message: "The board rejected that image." });
        return;
    }

    await driver.issueCommand({
        type: "command:camera:fly-to-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            drawdyElementIds: [drawdyElementId],
            flyDurationMs: FLY_DURATION_MS,
            zoom: 1,
        },
    });
    post({ type: "placed" });
}

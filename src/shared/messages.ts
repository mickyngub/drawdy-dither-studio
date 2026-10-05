export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type WebviewToDriver =
    | { type: "ready" }
    | { type: "params"; params: Record<string, unknown> }
    | {
          type: "place";
          dataUrl: string;
          pixelWidth: number;
          pixelHeight: number;
      }
    | { type: "close" };

export type DriverToWebview =
    | { type: "init"; params?: Record<string, unknown> }
    | { type: "placed" }
    | { type: "error"; message: string };

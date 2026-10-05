export type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type PlaceMode = "beside" | "replace";

export type WebviewToDriver =
    | { type: "ready" }
    | { type: "params"; params: Record<string, unknown> }
    | {
          type: "place";
          dataUrl: string;
          pixelWidth: number;
          pixelHeight: number;
          mode: PlaceMode;
      }
    | { type: "close" };

export type DriverToWebview =
    | { type: "init"; params?: Record<string, unknown> }
    | {
          type: "source";
          png: Blob;
          sourceIds: string[];
          rect: Rect | null;
      }
    | { type: "no-selection" }
    | { type: "placed" }
    | { type: "error"; message: string };

export type Layer =
  | { kind: "rect"; x: number; y: number; width: number; height: number; fill: string; radius?: number; stroke?: string }
  | { kind: "ellipse"; x: number; y: number; width: number; height: number; fill: string }
  | { kind: "text"; x: number; y: number; text: string; size: number; weight?: number; fill: string; width?: number };

export interface Artboard {
  id: string;
  name: string;
  /** Position and size in canvas coordinates (px at 100% zoom). */
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  layers: Layer[];
}

export interface DesignDocument {
  id: string;
  name: string;
  /** Increments whenever the document is saved. */
  revision: number;
  updatedAt: string;
  artboards: Artboard[];
}

export interface Viewport {
  /** Screen offset of the canvas origin, in CSS px. */
  x: number;
  y: number;
  zoom: number;
}

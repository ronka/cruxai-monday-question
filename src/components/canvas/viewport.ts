import type { Artboard, Viewport } from "@/types/canvas";

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

export interface Point {
  x: number;
  y: number;
}

/** Screen point (relative to the canvas element) → canvas coordinates. */
export function screenToCanvas(point: Point, viewport: Viewport): Point {
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}

/** Canvas coordinates → screen point (relative to the canvas element). */
export function canvasToScreen(point: Point, viewport: Viewport): Point {
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
}

/** Zooms by `factor`, keeping the canvas point under `anchor` fixed on screen. */
export function zoomAt(viewport: Viewport, anchor: Point, factor: number): Viewport {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * factor));
  const canvasPoint = screenToCanvas(anchor, viewport);
  return { zoom, x: anchor.x - canvasPoint.x * zoom, y: anchor.y - canvasPoint.y * zoom };
}

export function boundsOf(artboards: Pick<Artboard, "x" | "y" | "width" | "height">[]) {
  const minX = Math.min(...artboards.map((a) => a.x));
  const minY = Math.min(...artboards.map((a) => a.y));
  const maxX = Math.max(...artboards.map((a) => a.x + a.width));
  const maxY = Math.max(...artboards.map((a) => a.y + a.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Viewport that fits `bounds` inside a `size` element with padding. */
export function fitBounds(bounds: { x: number; y: number; width: number; height: number }, size: { width: number; height: number }, padding = 64): Viewport {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((size.width - padding * 2) / bounds.width, (size.height - padding * 2) / bounds.height)));
  return {
    zoom,
    x: (size.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (size.height - bounds.height * zoom) / 2 - bounds.y * zoom,
  };
}

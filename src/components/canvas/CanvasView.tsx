"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import type { Artboard, Viewport } from "@/types/canvas";
import { ArtboardSvg } from "./ArtboardSvg";
import { zoomAt } from "./viewport";

export interface CanvasHandle {
  /** Size of the canvas element in CSS px. */
  size: () => { width: number; height: number };
  element: () => HTMLDivElement | null;
}

interface Props {
  artboards: Artboard[];
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Rendered in canvas coordinates, above the artboards (scaled with the canvas). */
  children?: ReactNode;
  /** Rendered in screen coordinates, above everything (not scaled). */
  overlay?: ReactNode;
}

/**
 * Supplied pannable, zoomable canvas. Drag empty space (or hold Space and
 * drag anywhere) to pan; scroll to pan; Ctrl/⌘ + scroll or pinch to zoom.
 */
export const CanvasView = forwardRef<CanvasHandle, Props>(function CanvasView(
  { artboards, viewport, onViewportChange, selectedId, onSelect, children, overlay },
  ref,
) {
  const element = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const [panning, setPanning] = useState<{ x: number; y: number; origin: Viewport } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  useImperativeHandle(ref, () => ({
    size: () => ({ width: element.current?.clientWidth ?? 0, height: element.current?.clientHeight ?? 0 }),
    element: () => element.current,
  }));

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const current = viewportRef.current;
      if (event.ctrlKey || event.metaKey)
        onViewportChange(zoomAt(current, { x: event.clientX - rect.left, y: event.clientY - rect.top }, Math.exp(-event.deltaY * 0.01)));
      else onViewportChange({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [onViewportChange]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) && setSpaceDown(true);
    const up = (e: KeyboardEvent) => e.code === "Space" && setSpaceDown(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!panning) return;
    const move = (e: PointerEvent) =>
      onViewportChange({ ...panning.origin, x: panning.origin.x + e.clientX - panning.x, y: panning.origin.y + e.clientY - panning.y });
    const up = () => setPanning(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [panning, onViewportChange]);

  return (
    <div
      ref={element}
      data-testid="canvas"
      className={`relative h-full w-full overflow-hidden bg-[#e5e5e5] ${panning ? "cursor-grabbing" : spaceDown ? "cursor-grab" : "cursor-default"}`}
      onPointerDown={(e) => {
        const onArtboard = (e.target as HTMLElement).closest("[data-artboard]");
        if (spaceDown || !onArtboard) {
          if (!onArtboard) onSelect(null);
          setPanning({ x: e.clientX, y: e.clientY, origin: viewport });
        }
      }}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
        {artboards.map((artboard) => (
          <div key={artboard.id} className="absolute" style={{ left: artboard.x, top: artboard.y, width: artboard.width, height: artboard.height }}>
            <button
              type="button"
              data-artboard={artboard.id}
              className={`absolute bottom-full left-0 mb-1 origin-bottom-left whitespace-nowrap text-left ${selectedId === artboard.id ? "text-[#0d99ff]" : "text-neutral-500"}`}
              style={{ fontSize: 12 / viewport.zoom }}
              onClick={() => onSelect(artboard.id)}
            >
              {artboard.name}
            </button>
            <div
              data-artboard={artboard.id}
              onClick={() => onSelect(artboard.id)}
              className="shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
              style={{ outline: selectedId === artboard.id ? `${2 / viewport.zoom}px solid #0d99ff` : undefined }}
            >
              <ArtboardSvg artboard={artboard} />
            </div>
          </div>
        ))}
        {children}
      </div>
      {overlay}
    </div>
  );
});

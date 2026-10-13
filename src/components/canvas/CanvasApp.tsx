"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, Frame, Hash, Menu, MessageCircle, MousePointer2, Play } from "lucide-react";
import { DOCUMENT_ID, failNextDocumentLoad, getDocument, resetCanvasData, simulateTeammateEdit, subscribeToDocument } from "@/api/canvasApi";
import { failNextExport, setArtboardExportFailure } from "@/lib/export";
import { COLLABORATORS } from "@/data/canvasData";
import { MockControls } from "@/mock/MockControls";
import type { Viewport } from "@/types/canvas";
import { CanvasView, type CanvasHandle } from "./CanvasView";
import { boundsOf, fitBounds, zoomAt } from "./viewport";

export function CanvasApp() {
  const canvas = useRef<CanvasHandle>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 0.25 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["document", DOCUMENT_ID], queryFn: () => getDocument() });
  useEffect(() => subscribeToDocument(() => void queryClient.invalidateQueries({ queryKey: ["document"] })), [queryClient]);
  const document = query.data;
  const artboards = document?.artboards ?? [];
  const selected = artboards.find((artboard) => artboard.id === selectedId) ?? null;

  const fitAll = useCallback(() => {
    if (artboards.length) setViewport(fitBounds(boundsOf(artboards), canvas.current!.size()));
  }, [artboards]);
  const focus = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      const params = new URLSearchParams(window.location.search);
      if (id) params.set("artboard", id);
      else params.delete("artboard");
      window.history.replaceState(null, "", params.size ? `?${params}` : window.location.pathname);
      const artboard = artboards.find((item) => item.id === id);
      if (artboard) setViewport(fitBounds(artboard, canvas.current!.size(), 48));
    },
    [artboards],
  );

  // Initial view: the artboard in the URL, or everything.
  const initialized = useRef(false);
  useEffect(() => {
    if (!document || initialized.current) return;
    initialized.current = true;
    const id = new URLSearchParams(window.location.search).get("artboard");
    if (id && document.artboards.some((artboard) => artboard.id === id)) focus(id);
    else fitAll();
  }, [document, fitAll, focus]);

  const step = (direction: number) => {
    if (!artboards.length) return;
    const index = artboards.findIndex((artboard) => artboard.id === selectedId);
    focus(artboards[(index + direction + artboards.length) % artboards.length].id);
  };
  const zoomBy = (factor: number) => {
    const size = canvas.current!.size();
    setViewport((current) => zoomAt(current, { x: size.width / 2, y: size.height / 2 }, factor));
  };

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.shiftKey && e.code === "Digit1") fitAll();
      else if (e.shiftKey && e.code === "Digit2" && selectedId) focus(selectedId);
      else if (e.key === "+" || e.key === "=") zoomBy(1.25);
      else if (e.key === "-") zoomBy(0.8);
      else if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  });

  return (
    <div className="flex h-dvh flex-col bg-[#2c2c2c] text-[12px] text-neutral-800 [font-family:Inter,ui-sans-serif,system-ui,sans-serif]">
      <header className="flex h-11 shrink-0 items-center gap-1 px-2 text-white">
        <Menu className="mx-2 h-4 w-4" />
        <span className="rounded bg-[#0d99ff] p-1.5"><MousePointer2 className="h-4 w-4" /></span>
        <span className="p-1.5"><Frame className="h-4 w-4" /></span>
        <span className="p-1.5"><MessageCircle className="h-4 w-4" /></span>
        <div className="mx-auto flex items-center gap-1 text-[13px]">
          <span className="text-neutral-400">Drafts /</span> {document?.name ?? "Loading…"} <ChevronDown className="h-3 w-3 text-neutral-400" />
        </div>
        <div className="flex -space-x-1.5">
          {COLLABORATORS.map((user) => (
            <span key={user.id} title={user.name} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2c2c2c] text-[10px] font-semibold" style={{ background: user.color }}>
              {user.initials}
            </span>
          ))}
        </div>
        <Play className="mx-2 h-4 w-4" />
        <span className="rounded-md bg-[#0d99ff] px-3 py-1.5 font-medium">Share</span>
        <div className="ml-2 flex items-center rounded hover:bg-white/10" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" className="px-1.5 py-1" onClick={() => zoomBy(0.8)}>−</button>
          <button type="button" aria-label="Zoom to fit" title="Zoom to fit (Shift+1)" className="w-12 py-1 tabular-nums" onClick={fitAll}>
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button type="button" aria-label="Zoom in" className="px-1.5 py-1" onClick={() => zoomBy(1.25)}>+</button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Artboards" className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
          <p className="border-b border-neutral-200 px-4 py-3 font-semibold">Page 1</p>
          <div className="flex items-center justify-between px-4 pb-1 pt-3 text-neutral-500">
            <span className="font-semibold">Artboards</span>
            <span className="flex gap-1">
              <button type="button" aria-label="Previous artboard" className="rounded p-0.5 hover:bg-neutral-100" onClick={() => step(-1)}><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Next artboard" className="rounded p-0.5 hover:bg-neutral-100" onClick={() => step(1)}><ChevronRight className="h-3.5 w-3.5" /></button>
            </span>
          </div>
          {artboards.map((artboard) => (
            <button
              key={artboard.id}
              type="button"
              aria-current={artboard.id === selectedId}
              onClick={() => focus(artboard.id)}
              className={`flex items-center gap-2 px-4 py-1.5 text-left ${artboard.id === selectedId ? "bg-[#e5f4ff]" : "hover:bg-neutral-50"}`}
            >
              <Hash className="h-3 w-3 text-neutral-400" /> {artboard.name}
            </button>
          ))}
        </nav>
        <main className="relative min-w-0 flex-1">
          {query.isError ? (
            <p role="alert" className="p-6 text-red-700">
              Could not open this file. <button className="underline" onClick={() => void query.refetch()}>Retry</button>
            </p>
          ) : query.isPending ? (
            <p role="status" className="p-6 text-neutral-500">Opening file…</p>
          ) : null}
          <CanvasView ref={canvas} artboards={artboards} viewport={viewport} onViewportChange={setViewport} selectedId={selectedId} onSelect={setSelectedId} />
        </main>
        <aside aria-label="Properties" className="w-64 shrink-0 border-l border-neutral-200 bg-white">
          <div className="flex gap-4 border-b border-neutral-200 px-4 py-3 font-semibold">
            <span>Design</span>
            <span className="text-neutral-400">Prototype</span>
          </div>
          {selected ? (
            <div className="space-y-3 px-4 py-3">
              <p className="font-semibold">{selected.name}</p>
              <dl className="grid grid-cols-2 gap-2 text-neutral-600">
                {(["x", "y", "width", "height"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-2 rounded bg-neutral-100 px-2 py-1">
                    <dt className="uppercase text-neutral-400">{key === "width" ? "W" : key === "height" ? "H" : key}</dt>
                    <dd className="tabular-nums">{selected[key]}</dd>
                  </div>
                ))}
              </dl>
              <p className="flex items-center gap-2 text-neutral-600">
                <span className="h-4 w-4 rounded border border-neutral-300" style={{ background: selected.background }} /> {selected.background}
              </p>
              <p className="text-neutral-400">{selected.layers.length} layers · revision {document?.revision}</p>
              <div className="border-t border-neutral-200 pt-3">
                <p className="mb-1 font-semibold">Export</p>
                <p className="text-neutral-400">Not implemented yet.</p>
              </div>
            </div>
          ) : (
            <p className="px-4 py-3 text-neutral-500">Select an artboard to inspect it. Shift+1 fits everything; Shift+2 zooms to the selection.</p>
          )}
        </aside>
      </div>
      <MockControls
        sections={[
          { title: "Teammates", actions: [{ label: "Teammate edits “Home — Mobile”", run: () => simulateTeammateEdit("ab-home") }] },
          {
            title: "Export failures",
            actions: [
              { label: "Fail the next export", run: failNextExport },
              { label: "Always fail “Dashboard — Desktop”", run: () => setArtboardExportFailure("ab-dashboard", true) },
              { label: "Stop failing “Dashboard — Desktop”", run: () => setArtboardExportFailure("ab-dashboard", false) },
              { label: "Fail next file load (then reload)", run: failNextDocumentLoad },
            ],
          },
        ]}
        onReset={resetCanvasData}
      />
    </div>
  );
}

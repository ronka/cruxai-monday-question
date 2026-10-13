/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { canvasDb, getDocument } from "@/api/canvasApi";
import { canvasToScreen, fitBounds, screenToCanvas, zoomAt } from "@/components/canvas/viewport";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await canvasDb();
});

test("the seeded document has five artboards", async () => {
  const document = await getDocument();
  expect(document.artboards).toHaveLength(5);
  expect(document.revision).toBe(1);
});

test("viewport math round-trips and zooms around the anchor", () => {
  const viewport = { x: 120, y: -40, zoom: 0.5 };
  const point = { x: 300, y: 200 };
  expect(canvasToScreen(screenToCanvas(point, viewport), viewport)).toEqual(point);
  const zoomed = zoomAt(viewport, point, 2);
  expect(screenToCanvas(point, zoomed)).toEqual(screenToCanvas(point, viewport));
  const fit = fitBounds({ x: 0, y: 0, width: 1000, height: 500 }, { width: 600, height: 400 }, 50);
  expect(fit.zoom).toBe(0.5);
});

test("SVG export, progress, failure injection and cancellation", async () => {
  const { artboardToSvg, exportArtboard, failNextExport } = await import("@/lib/export");
  const { simulateTeammateEdit } = await import("@/api/canvasApi");
  const document = await getDocument();
  const login = document.artboards[0];
  expect(artboardToSvg(login)).toMatch(/^<svg[^>]+width="375"/);
  const progress: number[] = [];
  const result = await exportArtboard(login, { format: "svg", scale: 1 }, { onProgress: (p) => progress.push(p) });
  expect(result).toMatchObject({ width: 375, height: 812, format: "svg" });
  expect(progress.at(-1)).toBe(1);
  failNextExport();
  await expect(exportArtboard(login, { format: "svg", scale: 1 })).rejects.toThrow("Render service failed");
  const controller = new AbortController();
  const pending = exportArtboard(login, { format: "svg", scale: 1 }, { signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toThrow("canceled");
  expect((await simulateTeammateEdit()).revision).toBe(2);
}, 15000);

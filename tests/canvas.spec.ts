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

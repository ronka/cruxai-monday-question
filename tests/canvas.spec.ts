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

test("saves create versions and reject stale revisions; snapshots are immutable", async () => {
  const { getVersion, listVersions, RevisionConflictError, saveDocument, simulateTeammateSave } = await import("@/api/canvasApi");
  const document = await getDocument();
  expect(document.revision).toBe(4);
  const versions = await listVersions();
  expect(versions.map((v) => v.label)).toContain("Dashboard handoff");
  const first = await getVersion("v-1");
  expect(first.artboards).toHaveLength(2);
  await simulateTeammateSave();
  await expect(saveDocument(document.id, document.artboards, document.revision)).rejects.toBeInstanceOf(RevisionConflictError);
  const latest = await getDocument();
  const saved = await saveDocument(latest.id, latest.artboards.map((a) => ({ ...a, x: a.x + 1 })), latest.revision);
  expect(saved.revision).toBe(6);
  expect((await getVersion("v-1")).artboards).toEqual(first.artboards);
  await expect(getVersion("nope")).rejects.toThrow("Version not found");
});

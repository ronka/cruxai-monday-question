/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { DashboardConflictError, evaluate, getDashboard, pulseDb, sample, saveDashboard, simulateTeammateSave, stepFor } from "@/api/pulseApi";
import { clock, HOUR, MINUTE } from "@/mock/clock";
import { network } from "@/mock/network";

const NOW = Date.parse("2026-10-13T09:00:00Z");
beforeAll(async () => {
  clock.reset(NOW);
  network.setLatency(0);
  await pulseDb();
});

test("deterministic samples with a daily gap for worker in eu-west-1", () => {
  const t = Date.parse("2026-10-13T03:10:00Z");
  expect(sample("requests", "prod", "api", "us-east-1", t)).toBe(sample("requests", "prod", "api", "us-east-1", t));
  expect(sample("cpu", "prod", "worker", "eu-west-1", t)).toBeNull();
  expect(sample("cpu", "prod", "worker", "us-east-1", t)).not.toBeNull();
});

test("queries group series, use ~60 steps, and return null (not 0) for gaps", () => {
  const result = evaluate({ metric: "cpu", from: Date.parse("2026-10-13T02:00:00Z"), to: Date.parse("2026-10-13T05:00:00Z"), filters: { service: ["worker"], region: ["eu-west-1"] } });
  expect(result.stepMs).toBe(stepFor(3 * HOUR));
  expect(result.series).toHaveLength(1);
  expect(result.series[0].points.some((p) => p.v === null)).toBe(true);
  const grouped = evaluate({ metric: "requests", from: NOW - HOUR, to: NOW, groupBy: "service" });
  expect(grouped.series.map((s) => s.label)).toEqual(["service:api", "service:web", "service:worker", "service:billing"]);
  expect(stepFor(15 * MINUTE)).toBe(MINUTE);
});

test("saves detect a newer version", async () => {
  const dashboard = await getDashboard();
  await simulateTeammateSave();
  await expect(saveDashboard(dashboard.id, { title: "Mine" }, dashboard.version)).rejects.toBeInstanceOf(DashboardConflictError);
});

test("outage is missing data, maintenance is real zero", async () => {
  const { MAINTENANCE, OUTAGE } = await import("@/api/pulseApi");
  expect(sample("requests", "prod", "api", "us-east-1", OUTAGE.from + MINUTE)).toBeNull();
  expect(sample("requests", "prod", "api", "us-east-1", MAINTENANCE.from + MINUTE)).toBe(0);
  const lastWeek = evaluate({ metric: "requests", from: OUTAGE.from - HOUR, to: OUTAGE.to + HOUR });
  expect(lastWeek.series[0].points.some((p) => p.v === null)).toBe(true);
});

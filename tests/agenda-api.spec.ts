/** @jest-environment node */
import { beforeAll, expect, test } from "@jest/globals";
import { agendaDb, createEvent, EventConflictError, getEvent, listEvents, simulateRemoteMove, updateEvent } from "@/api/agendaApi";
import { network } from "@/mock/network";

beforeAll(async () => {
  network.setLatency(0);
  await agendaDb();
});

test("listEvents returns only overlapping events", async () => {
  const week = await listEvents("2026-10-11T04:00:00.000Z", "2026-10-18T04:00:00.000Z");
  expect(week.map((event) => event.title)).toContain("Design review");
  expect(week.map((event) => event.title)).not.toContain("Dentist");
  const edge = await listEvents("2026-10-12T14:30:00.000Z", "2026-10-12T15:00:00.000Z");
  expect(edge.map((event) => event.id)).not.toContain("evt-1"); // ends exactly at 14:30Z
});

test("updates reject stale versions and invalid ranges", async () => {
  const event = await getEvent("evt-1");
  await simulateRemoteMove("evt-1");
  await expect(updateEvent("evt-1", { title: "x" }, event.version)).rejects.toBeInstanceOf(EventConflictError);
  await expect(
    createEvent({ title: "Bad", startsAt: "2026-10-14T10:00:00Z", endsAt: "2026-10-14T09:00:00Z", timeZone: "UTC" }),
  ).rejects.toThrow("End must be after start");
});

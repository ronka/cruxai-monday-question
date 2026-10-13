/** @jest-environment node */
import { expect, test } from "@jest/globals";
import { addDays, fromWallTime, offsetMinutes, startOfWeek, toWallTime } from "@/lib/time";

test("round-trips wall times and handles DST in New York", () => {
  const instant = fromWallTime({ year: 2026, month: 11, day: 2, hour: 9, minute: 30 }, "America/New_York");
  expect(new Date(instant).toISOString()).toBe("2026-11-02T14:30:00.000Z");
  expect(toWallTime(instant, "America/New_York")).toMatchObject({ day: 2, hour: 9, minute: 30 });
  expect(offsetMinutes(Date.parse("2026-07-01T12:00:00Z"), "America/New_York")).toBe(-240);
  // 02:30 does not exist on 2026-03-08 in New York; it moves forward.
  const gap = fromWallTime({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, "America/New_York");
  expect(toWallTime(gap, "America/New_York").hour).toBe(3);
  // 01:30 happens twice on 2026-11-01; the earlier instant is returned.
  const ambiguous = fromWallTime({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, "America/New_York");
  expect(new Date(ambiguous).toISOString()).toBe("2026-11-01T05:30:00.000Z");
});

test("date keys", () => {
  expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  expect(startOfWeek("2026-10-15")).toBe("2026-10-11");
});

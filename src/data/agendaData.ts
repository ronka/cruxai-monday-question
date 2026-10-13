import { addDays, dateKey, fromWallTime, parseDateKey, startOfWeek, toWallTime } from "@/lib/time";
import { DEFAULT_START } from "@/mock/clock";
import type { Attendee } from "@/types/agenda";

export const OWNER = { email: "rina@fieldnotes.app", name: "Rina Sato" };
export const DEFAULT_TIME_ZONE = "America/New_York";

export const COLORS = ["#039be5", "#33b679", "#8e24aa", "#e67c73", "#f6bf26", "#616161"];

const people: Record<string, string> = {
  "marco@fieldnotes.app": "Marco Bellini",
  "aisha@fieldnotes.app": "Aisha Bello",
  "tom@client.co": "Tom Becker",
  "jun@fieldnotes.app": "Jun Park",
};
const a = (email: string, response: Attendee["response"] = "accepted"): Attendee => ({ email, name: people[email], response });

type Seed = { title: string; day: number; start: [number, number]; minutes: number; color: number; location?: string; attendees?: Attendee[]; organizer?: string; allDay?: boolean };

/** Day offsets are relative to Sunday of the mock clock's current week (Oct 11, 2026). */
const seeds: Seed[] = [
  { title: "Weekly planning", day: 1, start: [9, 30], minutes: 60, color: 0, attendees: [a("marco@fieldnotes.app"), a("aisha@fieldnotes.app")] },
  { title: "Design review", day: 2, start: [14, 0], minutes: 90, color: 2, location: "Room 4B", attendees: [a("aisha@fieldnotes.app"), a("jun@fieldnotes.app", "tentative")] },
  { title: "Lunch with Tom", day: 2, start: [12, 0], minutes: 60, color: 1, location: "Corner Bistro", attendees: [a("tom@client.co")] },
  { title: "Focus time", day: 3, start: [9, 0], minutes: 180, color: 5 },
  { title: "Customer call — Becker GmbH", day: 3, start: [11, 0], minutes: 45, color: 3, organizer: "tom@client.co", attendees: [a("tom@client.co"), a(OWNER.email, "needsAction")] },
  { title: "1:1 with Marco", day: 4, start: [10, 0], minutes: 30, color: 0, attendees: [a("marco@fieldnotes.app")] },
  { title: "Sprint demo", day: 5, start: [15, 0], minutes: 60, color: 4, organizer: "jun@fieldnotes.app", attendees: [a("jun@fieldnotes.app"), a(OWNER.email, "accepted"), a("aisha@fieldnotes.app")] },
  { title: "Dentist", day: 8, start: [8, 0], minutes: 60, color: 3 },
  { title: "Weekly planning", day: 8, start: [9, 30], minutes: 60, color: 0, attendees: [a("marco@fieldnotes.app"), a("aisha@fieldnotes.app")] },
  { title: "Quarterly offsite", day: 10, start: [0, 0], minutes: 2 * 24 * 60, color: 1, allDay: true },
  { title: "Weekly planning", day: -6, start: [9, 30], minutes: 60, color: 0, attendees: [a("marco@fieldnotes.app"), a("aisha@fieldnotes.app")] },
  { title: "Hiring sync", day: 16, start: [13, 0], minutes: 30, color: 2, organizer: "aisha@fieldnotes.app", attendees: [a("aisha@fieldnotes.app"), a(OWNER.email, "accepted")] },
  { title: "Flight to Lisbon", day: 20, start: [18, 45], minutes: 7 * 60, color: 5, location: "JFK T1" },
];

export function seedEvents() {
  const sunday = startOfWeek(dateKey(toWallTime(DEFAULT_START, DEFAULT_TIME_ZONE)));
  return seeds.map((seed, index) => {
    const { year, month, day } = parseDateKey(addDays(sunday, seed.day));
    const start = fromWallTime({ year, month, day, hour: seed.start[0], minute: seed.start[1] }, DEFAULT_TIME_ZONE);
    const end = seed.allDay
      ? (() => {
          const endDay = parseDateKey(addDays(dateKey({ year, month, day }), seed.minutes / 1440));
          return fromWallTime({ ...endDay, hour: 0, minute: 0 }, DEFAULT_TIME_ZONE);
        })()
      : start + seed.minutes * 60000;
    return {
      id: `evt-${index + 1}`,
      title: seed.title,
      startsAt: new Date(start).toISOString(),
      endsAt: new Date(end).toISOString(),
      allDay: !!seed.allDay,
      timeZone: DEFAULT_TIME_ZONE,
      color: COLORS[seed.color],
      location: seed.location ?? "",
      organizer: seed.organizer ?? OWNER.email,
      attendees: seed.attendees ?? [],
    };
  });
}

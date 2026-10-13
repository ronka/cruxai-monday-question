import { COLORS, OWNER, seedEvents } from "@/data/agendaData";
import { clock, HOUR } from "@/mock/clock";
import { createEmitter, newId } from "@/mock/events";
import { network, simulate } from "@/mock/network";
import { openDatabase, type LocalDatabase } from "@/mock/sqlite";
import type { AgendaEvent, CalendarEvent, EventInput } from "@/types/agenda";

// Browser-local mock server backed by SQLite. Data persists across refreshes;
// "Reset local data" in the mock controls restores the fixtures.
const SCHEMA = `
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
CREATE INDEX events_range ON events (starts_at, ends_at);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export function agendaDb(): Promise<LocalDatabase> {
  return openDatabase({
    name: "agenda",
    version: 1,
    schema: SCHEMA,
    seed: (db) => {
      const now = clock.date().toISOString();
      for (const event of seedEvents()) {
        const { id, startsAt, endsAt, ...data } = event;
        db.run("INSERT INTO events VALUES (?, ?, ?, ?, 1, ?)", [id, startsAt, endsAt, JSON.stringify(data), now]);
      }
    },
  });
}

const emitter = createEmitter<AgendaEvent>();
/** Live changes, including simulated edits from another device. */
export const subscribeToAgenda = emitter.subscribe;

export class EventConflictError extends Error {
  constructor(readonly current: CalendarEvent) {
    super(`“${current.title}” was changed elsewhere. Your change was not saved.`);
    this.name = "EventConflictError";
  }
}

type Row = { id: string; starts_at: string; ends_at: string; data: string; version: number; updated_at: string };
const toEvent = (row: Row): CalendarEvent => ({
  ...JSON.parse(row.data),
  id: row.id,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  version: row.version,
  updatedAt: row.updated_at,
});

export function readEvent(db: LocalDatabase, id: string): CalendarEvent {
  const row = db.get<Row>("SELECT * FROM events WHERE id = ?", [id]);
  if (!row) throw new Error("Event not found");
  return toEvent(row);
}

function validate(input: Pick<EventInput, "title" | "startsAt" | "endsAt">) {
  if (!input.title.trim()) throw new Error("Add a title");
  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) throw new Error("Invalid date");
  if (end <= start) throw new Error("End must be after start");
}

/** Events overlapping [from, to), ordered by start. */
export async function listEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const db = await agendaDb();
  return simulate("listEvents", () =>
    db.all<Row>("SELECT * FROM events WHERE starts_at < ? AND ends_at > ? ORDER BY starts_at", [to, from]).map(toEvent),
  );
}

export async function getEvent(id: string): Promise<CalendarEvent> {
  const db = await agendaDb();
  return simulate("getEvent", () => readEvent(db, id));
}

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  const db = await agendaDb();
  return simulate("createEvent", () => {
    validate(input);
    const id = newId("evt-");
    const data = {
      title: input.title.trim(),
      allDay: input.allDay ?? false,
      timeZone: input.timeZone,
      color: input.color ?? COLORS[0],
      location: input.location ?? "",
      organizer: OWNER.email,
      attendees: input.attendees ?? [],
    };
    db.run("INSERT INTO events VALUES (?, ?, ?, ?, 1, ?)", [id, input.startsAt, input.endsAt, JSON.stringify(data), clock.date().toISOString()]);
    emitter.emit({ type: "event", eventId: id });
    return readEvent(db, id);
  });
}

/**
 * Updates an event. Pass the `version` you edited to reject with
 * `EventConflictError` if it changed since.
 */
export async function updateEvent(id: string, patch: Partial<EventInput>, expectedVersion?: number): Promise<CalendarEvent> {
  const db = await agendaDb();
  return simulate("updateEvent", () => writeEvent(db, id, patch, expectedVersion));
}

export function writeEvent(db: LocalDatabase, id: string, patch: Partial<EventInput>, expectedVersion?: number): CalendarEvent {
  const current = readEvent(db, id);
  if (expectedVersion !== undefined && expectedVersion !== current.version) throw new EventConflictError(current);
  const next = { ...current, ...patch, title: (patch.title ?? current.title).trim() };
  validate(next);
  const { id: _id, startsAt, endsAt, version, updatedAt, ...data } = next;
  db.run("UPDATE events SET starts_at = ?, ends_at = ?, data = ?, version = version + 1, updated_at = ? WHERE id = ?", [
    startsAt,
    endsAt,
    JSON.stringify(data),
    clock.date().toISOString(),
    id,
  ]);
  emitter.emit({ type: "event", eventId: id });
  return readEvent(db, id);
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await agendaDb();
  return simulate("deleteEvent", () => {
    readEvent(db, id);
    db.run("DELETE FROM events WHERE id = ?", [id]);
    emitter.emit({ type: "deleted", eventId: id });
  });
}

/** Saved user preference: the time zone the calendar is displayed in. */
export async function getTimeZonePreference(): Promise<string | null> {
  const db = await agendaDb();
  return db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'timeZone'")?.value ?? null;
}

export async function setTimeZonePreference(timeZone: string): Promise<void> {
  const db = await agendaDb();
  db.run("INSERT INTO settings VALUES ('timeZone', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [timeZone]);
}

/** Mock control: another device moves an event one hour later. */
export async function simulateRemoteMove(id: string): Promise<CalendarEvent> {
  const db = await agendaDb();
  const event = readEvent(db, id);
  return writeEvent(db, id, {
    startsAt: new Date(Date.parse(event.startsAt) + HOUR).toISOString(),
    endsAt: new Date(Date.parse(event.endsAt) + HOUR).toISOString(),
  });
}

export function failNextEventUpdate(): void {
  network.failNext("updateEvent");
}

export async function resetAgendaData(): Promise<void> {
  await (await agendaDb()).reset();
  clock.reset();
}

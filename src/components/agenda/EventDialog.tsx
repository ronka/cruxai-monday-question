"use client";

import { useState } from "react";
import { Clock, MapPin, Trash2, Users, X } from "lucide-react";
import { COLORS } from "@/data/agendaData";
import { dateKey, fromWallTime, parseDateKey, toWallTime } from "@/lib/time";
import type { CalendarEvent, EventInput } from "@/types/agenda";

interface Props {
  /** Existing event to edit, or a start instant for a new one. */
  event: CalendarEvent | null;
  defaultStart: number;
  timeZone: string;
  onClose: () => void;
  onSave: (input: EventInput, event: CalendarEvent | null) => Promise<void>;
  onDelete: (event: CalendarEvent) => Promise<void>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const timeValue = (instant: number, timeZone: string) => {
  const wall = toWallTime(instant, timeZone);
  return `${pad(wall.hour)}:${pad(wall.minute)}`;
};

/** Create or edit a single event. Times are entered in the display time zone. */
export function EventDialog({ event, defaultStart, timeZone, onClose, onSave, onDelete }: Props) {
  const start = event ? Date.parse(event.startsAt) : defaultStart;
  const end = event ? Date.parse(event.endsAt) : defaultStart + 3600000;
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(dateKey(toWallTime(start, timeZone)));
  const [from, setFrom] = useState(timeValue(start, timeZone));
  const [to, setTo] = useState(timeValue(end, timeZone));
  const [location, setLocation] = useState(event?.location ?? "");
  const [color, setColor] = useState(event?.color ?? COLORS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const instant = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return fromWallTime({ ...parseDateKey(date), hour, minute }, timeZone);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const startsAt = instant(from);
      let endsAt = instant(to);
      if (event?.allDay) endsAt = Date.parse(event.endsAt) - Date.parse(event.startsAt) + startsAt;
      await onSave(
        {
          title,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          allDay: event?.allDay ?? false,
          timeZone: event?.timeZone ?? timeZone,
          location,
          color,
        },
        event,
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded border-b border-neutral-300 bg-neutral-50 px-2 py-1 outline-none focus:border-blue-600";
  return (
    <div role="dialog" aria-modal="true" aria-label={event ? "Edit event" : "New event"} className="fixed inset-0 z-40 flex items-center justify-center bg-black/20" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-[460px] rounded-lg bg-white p-5 text-[14px] shadow-2xl">
        <div className="mb-3 flex justify-end gap-1 text-neutral-500">
          {event && (
            <button type="button" aria-label="Delete event" className="rounded-full p-1.5 hover:bg-neutral-100" onClick={() => void onDelete(event)}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" aria-label="Close" className="rounded-full p-1.5 hover:bg-neutral-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <input autoFocus aria-label="Title" placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 w-full border-b border-neutral-300 pb-1 text-2xl outline-none focus:border-blue-600" />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Clock className="h-4 w-4 text-neutral-500" />
          <input aria-label="Date" type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          {!event?.allDay && (
            <>
              <input aria-label="Start time" type="time" step={900} className={input} value={from} onChange={(e) => setFrom(e.target.value)} />–
              <input aria-label="End time" type="time" step={900} className={input} value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          {event?.allDay && <span className="text-neutral-500">All day</span>}
        </div>
        <label className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-neutral-500" />
          <input aria-label="Location" placeholder="Add location" className={`${input} flex-1`} value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        {event && event.attendees.length > 0 && (
          <div className="mb-3 flex items-start gap-2 text-[13px]">
            <Users className="mt-0.5 h-4 w-4 text-neutral-500" />
            <ul>
              {event.attendees.map((attendee) => (
                <li key={attendee.email}>
                  {attendee.name} <span className="text-neutral-500">· {attendee.response === "needsAction" ? "awaiting" : attendee.response}</span>
                </li>
              ))}
              <li className="text-neutral-500">Organizer: {event.organizer}</li>
            </ul>
          </div>
        )}
        <div className="mb-4 flex gap-2" role="radiogroup" aria-label="Color">
          {COLORS.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={color === option} aria-label={option} onClick={() => setColor(option)} className={`h-5 w-5 rounded-full ${color === option ? "ring-2 ring-neutral-800 ring-offset-2" : ""}`} style={{ background: option }} />
          ))}
        </div>
        {error && <p role="alert" className="mb-3 text-[13px] text-red-700">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="rounded bg-blue-600 px-5 py-1.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

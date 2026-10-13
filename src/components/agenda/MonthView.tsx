"use client";

import { addDays, dateKey, formatInZone, fromWallTime, parseDateKey, startOfWeek, toWallTime } from "@/lib/time";
import type { CalendarEvent } from "@/types/agenda";

interface Props {
  /** Any date key inside the month to show. */
  anchor: string;
  events: CalendarEvent[];
  timeZone: string;
  now: number;
  onSelect: (event: CalendarEvent) => void;
  onOpenDay: (key: string) => void;
}

export function monthGridRange(anchor: string): { first: string; days: string[] } {
  const { year, month } = parseDateKey(anchor);
  const first = startOfWeek(dateKey({ year, month, day: 1 }));
  return { first, days: Array.from({ length: 42 }, (_, i) => addDays(first, i)) };
}

/** Supplied month grid (6 weeks) with up to three events per day. */
export function MonthView({ anchor, events, timeZone, now, onSelect, onOpenDay }: Props) {
  const { month } = parseDateKey(anchor);
  const { days } = monthGridRange(anchor);
  const today = dateKey(toWallTime(now, timeZone));
  return (
    <div className="grid h-full grid-cols-7 grid-rows-[auto_repeat(6,1fr)] border-l border-neutral-200">
      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((label) => (
        <div key={label} className="border-b border-r border-neutral-200 py-1 text-center text-[11px] font-medium text-neutral-500">{label}</div>
      ))}
      {days.map((key) => {
        const start = fromWallTime({ ...parseDateKey(key), hour: 0, minute: 0 }, timeZone);
        const end = fromWallTime({ ...parseDateKey(addDays(key, 1)), hour: 0, minute: 0 }, timeZone);
        const dayEvents = events.filter((event) => Date.parse(event.startsAt) < end && Date.parse(event.endsAt) > start);
        const { day, month: cellMonth } = parseDateKey(key);
        return (
          <div key={key} className="min-h-0 overflow-hidden border-b border-r border-neutral-200 p-1">
            <button
              type="button"
              onClick={() => onOpenDay(key)}
              className={`mx-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${key === today ? "bg-blue-600 text-white" : cellMonth === month ? "text-neutral-700 hover:bg-neutral-100" : "text-neutral-400"}`}
            >
              {day}
            </button>
            {dayEvents.slice(0, 3).map((event) => (
              <button key={event.id} type="button" onClick={() => onSelect(event)} className="flex w-full items-center gap-1 truncate rounded px-1 text-left text-[12px] hover:bg-neutral-100">
                {event.allDay ? (
                  <span className="w-full truncate rounded px-1 text-white" style={{ background: event.color }}>{event.title}</span>
                ) : (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: event.color }} />
                    <span className="text-neutral-500">{formatInZone(Date.parse(event.startsAt), timeZone, { hour: "numeric", minute: "2-digit" }).replace(":00", "")}</span>
                    <span className="truncate text-neutral-800">{event.title}</span>
                  </>
                )}
              </button>
            ))}
            {dayEvents.length > 3 && (
              <button type="button" onClick={() => onOpenDay(key)} className="px-1 text-[12px] font-medium text-neutral-600 hover:underline">
                {dayEvents.length - 3} more
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

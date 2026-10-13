"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, dateKey, formatInZone, fromWallTime, parseDateKey, toWallTime } from "@/lib/time";
import { OWNER } from "@/data/agendaData";
import type { CalendarEvent } from "@/types/agenda";

const myResponse = (event: CalendarEvent) => event.attendees.find((a) => a.email === OWNER.email)?.response;

const HOUR_PX = 48;
const SNAP = 15;

interface Props {
  days: string[];
  events: CalendarEvent[];
  timeZone: string;
  now: number;
  onCreate: (start: number) => void;
  onSelect: (event: CalendarEvent) => void;
  onMove: (event: CalendarEvent, startsAt: number, endsAt: number) => void;
}

interface Segment {
  event: CalendarEvent;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

const dayStart = (key: string, timeZone: string) => fromWallTime({ ...parseDateKey(key), hour: 0, minute: 0 }, timeZone);
const wallMinutes = (instant: number, timeZone: string) => {
  const wall = toWallTime(instant, timeZone);
  return wall.hour * 60 + wall.minute;
};

function layoutDay(key: string, events: CalendarEvent[], timeZone: string): Segment[] {
  const start = dayStart(key, timeZone);
  const end = dayStart(addDays(key, 1), timeZone);
  const items = events
    .filter((event) => !event.allDay && Date.parse(event.startsAt) < end && Date.parse(event.endsAt) > start)
    .map((event) => {
      const from = Math.max(Date.parse(event.startsAt), start);
      const to = Math.min(Date.parse(event.endsAt), end);
      const top = from === start ? 0 : wallMinutes(from, timeZone);
      const bottom = to === end ? 24 * 60 : wallMinutes(to, timeZone);
      return { event, top, height: Math.max(bottom - top, 20), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.top - b.top || b.height - a.height);
  // Greedy lanes within clusters of overlapping events.
  let cluster: Segment[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(...cluster.map((item) => item.lane)) + 1;
    cluster.forEach((item) => (item.lanes = lanes));
    cluster = [];
  };
  for (const item of items) {
    if (item.top >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((other) => other.top + other.height > item.top).map((other) => other.lane));
    while (used.has(item.lane)) item.lane++;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.top + item.height);
  }
  if (cluster.length) flush();
  return items;
}

/** Supplied week grid: positions timed events, creates on click, and reschedules by drag. */
export function WeekView({ days, events, timeZone, now, onCreate, onSelect, onMove }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ event: CalendarEvent; x: number; y: number; dx: number; dy: number } | null>(null);
  const today = dateKey(toWallTime(now, timeZone));

  useEffect(() => {
    scroller.current?.scrollTo({ top: 7.5 * HOUR_PX });
  }, []);

  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dragging = !!drag;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setDrag((current) => current && { ...current, dx: e.clientX - current.x, dy: e.clientY - current.y });
    const up = () => {
      const current = dragRef.current;
      setDrag(null);
      if (!current) return;
      const columnWidth = (grid.current?.clientWidth ?? 700) / 7;
      const dayDelta = Math.round(current.dx / columnWidth);
      const minuteDelta = Math.round(((current.dy / HOUR_PX) * 60) / SNAP) * SNAP;
      if (!dayDelta && !minuteDelta) return onSelect(current.event);
      const start = Date.parse(current.event.startsAt);
      const wall = toWallTime(start, timeZone);
      const day = parseDateKey(addDays(dateKey(wall), dayDelta));
      const minutes = wall.hour * 60 + wall.minute + minuteDelta;
      const nextStart = fromWallTime({ ...day, hour: 0, minute: 0 }, timeZone) + minutes * 60000;
      onMove(current.event, nextStart, nextStart + (Date.parse(current.event.endsAt) - start));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, onMove, onSelect, timeZone]);

  const allDay = events.filter((event) => event.allDay);
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-neutral-200 pr-3">
        <div className="flex items-end justify-end pb-1 pr-2 text-[10px] text-neutral-500">
          {formatInZone(now, timeZone, { timeZoneName: "short" }).split(" ").pop()}
        </div>
        {days.map((key) => {
          const { year, month, day } = parseDateKey(key);
          const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase();
          return (
            <div key={key} className="py-2 text-center">
              <div className={`text-[11px] font-medium ${key === today ? "text-blue-600" : "text-neutral-500"}`}>{label}</div>
              <div className={`mx-auto mt-0.5 flex h-11 w-11 items-center justify-center rounded-full text-2xl ${key === today ? "bg-blue-600 text-white" : "text-neutral-700"}`}>{day}</div>
            </div>
          );
        })}
        <div className="border-t border-neutral-100" />
        {days.map((key) => {
          const start = dayStart(key, timeZone);
          const end = dayStart(addDays(key, 1), timeZone);
          return (
            <div key={key} className="min-h-6 space-y-0.5 border-l border-t border-neutral-100 p-0.5">
              {allDay
                .filter((event) => Date.parse(event.startsAt) < end && Date.parse(event.endsAt) > start)
                .map((event) => (
                  <button key={event.id} type="button" onClick={() => onSelect(event)} className="block w-full truncate rounded px-1.5 text-left text-[12px] text-white" style={{ background: event.color }}>
                    {event.title}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div className="relative grid grid-cols-[64px_1fr]" style={{ height: 24 * HOUR_PX }}>
          <div className="relative">
            {Array.from({ length: 23 }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-[10px] text-neutral-500" style={{ top: (i + 1) * HOUR_PX }}>
                {new Date(Date.UTC(2026, 0, 1, i + 1)).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" })}
              </span>
            ))}
          </div>
          <div ref={grid} className="relative grid grid-cols-7">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-neutral-100" style={{ top: i * HOUR_PX }} />
            ))}
            {days.map((key) => (
              <div
                key={key}
                data-day={key}
                className="relative border-l border-neutral-200"
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const minutes = Math.floor(((e.nativeEvent.offsetY / HOUR_PX) * 60) / 30) * 30;
                  onCreate(dayStart(key, timeZone) + minutes * 60000);
                }}
              >
                {key === today && (
                  <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500" style={{ top: (wallMinutes(now, timeZone) / 60) * HOUR_PX }}>
                    <span className="absolute -left-1.5 -top-[7px] h-3 w-3 rounded-full bg-red-500" />
                  </div>
                )}
                {layoutDay(key, events, timeZone).map(({ event, top, height, lane, lanes }) => {
                  const isDragged = drag?.event.id === event.id;
                  const response = event.organizer === OWNER.email ? "accepted" : myResponse(event);
                  const pending = response === "needsAction" || response === "tentative";
                  return (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${event.title}, ${formatInZone(Date.parse(event.startsAt), timeZone, { weekday: "long", hour: "numeric", minute: "2-digit" })}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setDrag({ event, x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
                      }}
                      onKeyDown={(e) => e.key === "Enter" && onSelect(event)}
                      className={`absolute z-10 cursor-grab overflow-hidden rounded-md border border-white px-1.5 py-0.5 text-[12px] leading-tight text-white shadow-sm ${isDragged ? "opacity-80 shadow-lg" : ""}`}
                      style={{
                        top: (top / 60) * HOUR_PX,
                        height: (height / 60) * HOUR_PX - 2,
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                        background: pending ? "white" : event.color,
                        color: pending ? event.color : undefined,
                        borderColor: pending ? event.color : undefined,
                        opacity: response === "declined" ? 0.45 : undefined,
                        textDecoration: response === "declined" ? "line-through" : undefined,
                        transform: isDragged ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined,
                      }}
                    >
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="truncate opacity-90">
                        {formatInZone(Date.parse(event.startsAt), timeZone, { hour: "numeric", minute: "2-digit" })} – {formatInZone(Date.parse(event.endsAt), timeZone, { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

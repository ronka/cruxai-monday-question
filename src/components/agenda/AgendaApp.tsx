"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Menu, Plus } from "lucide-react";
import {
  createEvent,
  deleteEvent,
  failNextEventUpdate,
  getTimeZonePreference,
  listEvents,
  resetAgendaData,
  setTimeZonePreference,
  simulateCompetingBooking,
  simulateRemoteMove,
  subscribeToAgenda,
  updateEvent,
} from "@/api/agendaApi";
import { DEFAULT_TIME_ZONE, OWNER } from "@/data/agendaData";
import { addDays, dateKey, fromWallTime, parseDateKey, startOfWeek, TIME_ZONES, toWallTime } from "@/lib/time";
import { MockControls, useMockClock } from "@/mock/MockControls";
import type { CalendarEvent, EventInput } from "@/types/agenda";
import { EventDialog } from "./EventDialog";
import { monthGridRange, MonthView } from "./MonthView";
import { WeekView } from "./WeekView";

type View = "week" | "month";

export function AgendaApp() {
  const queryClient = useQueryClient();
  const now = useMockClock();
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => dateKey(toWallTime(now, DEFAULT_TIME_ZONE)));
  const [dialog, setDialog] = useState<{ event: CalendarEvent | null; start: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getTimeZonePreference().then((saved) => saved && setTimeZone(saved));
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "month") setView("month");
    if (params.get("date")) setAnchor(params.get("date")!);
    else setAnchor(dateKey(toWallTime(now, DEFAULT_TIME_ZONE)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => subscribeToAgenda(() => void queryClient.invalidateQueries({ queryKey: ["events"] })), [queryClient]);
  useEffect(() => {
    window.history.replaceState(null, "", `?view=${view}&date=${anchor}`);
  }, [view, anchor]);

  const range = useMemo(() => {
    const first = view === "week" ? startOfWeek(anchor) : monthGridRange(anchor).first;
    const days = Array.from({ length: view === "week" ? 7 : 42 }, (_, i) => addDays(first, i));
    const from = fromWallTime({ ...parseDateKey(days[0]), hour: 0, minute: 0 }, timeZone);
    const to = fromWallTime({ ...parseDateKey(addDays(days[days.length - 1], 1)), hour: 0, minute: 0 }, timeZone);
    return { days, from: new Date(from).toISOString(), to: new Date(to).toISOString() };
  }, [anchor, view, timeZone]);
  const eventsQuery = useQuery({ queryKey: ["events", range.from, range.to], queryFn: () => listEvents(range.from, range.to) });
  const events = eventsQuery.data ?? [];

  const move = useCallback(
    async (event: CalendarEvent, startsAt: number, endsAt: number) => {
      setError("");
      const key = ["events", range.from, range.to];
      const previous = queryClient.getQueryData<CalendarEvent[]>(key);
      const patch = { startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() };
      queryClient.setQueryData<CalendarEvent[]>(key, (list) => list?.map((item) => (item.id === event.id ? { ...item, ...patch } : item)));
      try {
        await updateEvent(event.id, patch, event.version);
      } catch (cause) {
        queryClient.setQueryData(key, previous);
        setError((cause as Error).message);
      } finally {
        void queryClient.invalidateQueries({ queryKey: ["events"] });
      }
    },
    [queryClient, range.from, range.to],
  );
  const select = useCallback((event: CalendarEvent) => setDialog({ event, start: Date.parse(event.startsAt) }), []);
  const create = useCallback((start: number) => setDialog({ event: null, start }), []);

  async function save(input: EventInput, event: CalendarEvent | null) {
    if (event) await updateEvent(event.id, input, event.version);
    else await createEvent(input);
    setDialog(null);
  }

  const step = (direction: number) => {
    if (view === "week") setAnchor(addDays(anchor, direction * 7));
    else {
      const { year, month } = parseDateKey(anchor);
      const next = new Date(Date.UTC(year, month - 1 + direction, 1));
      setAnchor(dateKey({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: 1 }));
    }
  };
  const { year, month } = parseDateKey(view === "week" ? addDays(startOfWeek(anchor), 3) : anchor);
  const title = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-800 [font-family:Roboto,Arial,ui-sans-serif,sans-serif]">
      <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-2">
        <Menu className="h-5 w-5 text-neutral-600" />
        <span className="flex items-center gap-2 pr-6 text-[22px] text-neutral-600">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-blue-600 text-[15px] font-bold text-blue-600">{parseDateKey(dateKey(toWallTime(now, timeZone))).day}</span>
          Agenda
        </span>
        <button type="button" className="rounded border border-neutral-300 px-4 py-1.5 text-[14px] font-medium hover:bg-neutral-50" onClick={() => setAnchor(dateKey(toWallTime(now, timeZone)))}>
          Today
        </button>
        <button type="button" aria-label="Previous" className="rounded-full p-1.5 hover:bg-neutral-100" onClick={() => step(-1)}><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" aria-label="Next" className="rounded-full p-1.5 hover:bg-neutral-100" onClick={() => step(1)}><ChevronRight className="h-5 w-5" /></button>
        <h1 className="text-[22px] text-neutral-800">{title}</h1>
        <div className="ml-auto flex items-center gap-2 text-[14px]">
          <label className="flex items-center gap-1 text-neutral-600">
            <span className="sr-only">Time zone</span>
            <select
              className="rounded border border-neutral-300 px-2 py-1.5"
              value={timeZone}
              onChange={(e) => {
                setTimeZone(e.target.value);
                void setTimeZonePreference(e.target.value);
              }}
            >
              {TIME_ZONES.map((zone) => <option key={zone} value={zone}>{zone.replace("_", " ")}</option>)}
            </select>
          </label>
          <select aria-label="View" className="rounded border border-neutral-300 px-3 py-1.5 font-medium" value={view} onChange={(e) => setView(e.target.value as View)}>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
          <span className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-[13px] text-white" title={OWNER.email}>RS</span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 px-3 py-4">
          <button type="button" onClick={() => create(now + 3600000 - (now % 3600000))} className="mb-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-[14px] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:bg-blue-50">
            <Plus className="h-6 w-6 text-blue-600" /> Create
          </button>
          <p className="mb-2 text-[13px] font-medium">My calendars</p>
          <p className="flex items-center gap-2 text-[13px]"><span className="h-3 w-3 rounded-sm bg-blue-600" /> {OWNER.name}</p>
          <p className="mt-6 text-[12px] text-neutral-500">Times shown in {timeZone.replace("_", " ")}.</p>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          {error && (
            <p role="alert" className="mx-3 mt-2 rounded bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {error} <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
            </p>
          )}
          {eventsQuery.isError && (
            <p role="alert" className="m-3 text-[13px] text-red-700">
              Could not load events. <button className="underline" onClick={() => void eventsQuery.refetch()}>Retry</button>
            </p>
          )}
          <div className={`min-h-0 flex-1 ${eventsQuery.isPending ? "opacity-60" : ""}`}>
            {view === "week" ? (
              <WeekView days={range.days} events={events} timeZone={timeZone} now={now} onCreate={create} onSelect={select} onMove={move} />
            ) : (
              <MonthView anchor={anchor} events={events} timeZone={timeZone} now={now} onSelect={select} onOpenDay={(key) => { setAnchor(key); setView("week"); }} />
            )}
          </div>
        </main>
      </div>
      {dialog && (
        <EventDialog
          event={dialog.event}
          defaultStart={dialog.start}
          timeZone={timeZone}
          onClose={() => setDialog(null)}
          onSave={save}
          onDelete={async (event) => {
            await deleteEvent(event.id);
            setDialog(null);
          }}
        />
      )}
      <MockControls
        showClock
        timeZone={timeZone}
        sections={[
          {
            title: "Other devices",
            actions: [{ label: "Another device moves “Weekly planning” +1h", run: () => simulateRemoteMove("evt-1") }],
          },
          {
            title: "Booking",
            actions: [
              {
                label: "Another visitor books a slot…",
                run: async () => {
                  const value = window.prompt("Slot start as ISO (UTC), e.g. 2026-10-14T14:00:00Z", "2026-10-14T14:00:00Z");
                  if (value) await simulateCompetingBooking(value, 30);
                },
              },
            ],
          },
          { title: "Failures", actions: [{ label: "Fail next event update", run: failNextEventUpdate }] },
        ]}
        onReset={resetAgendaData}
      />
    </div>
  );
}

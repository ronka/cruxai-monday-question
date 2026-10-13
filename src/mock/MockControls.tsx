"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { FlaskConical, X } from "lucide-react";
import { clock, DAY, DEFAULT_START, HOUR, MINUTE } from "./clock";

export function useMockClock(): number {
  return useSyncExternalStore(clock.subscribe, clock.now, () => DEFAULT_START);
}

export interface MockAction {
  label: string;
  run: () => unknown;
  /** Shown under the button, e.g. "armed" for a pending one-shot failure. */
  hint?: string;
}

export interface MockSection {
  title: string;
  actions: MockAction[];
}

interface Props {
  sections: MockSection[];
  /** Show the mock clock and its advance buttons. */
  showClock?: boolean;
  /** Time zone used to display the mock clock. */
  timeZone?: string;
  onReset?: () => unknown;
}

/**
 * Floating panel for deterministic test controls: the mock clock, simulated
 * collaborators, and injected failures. Part of the starter, not the product.
 */
export function MockControls({ sections, showClock, timeZone, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const now = useMockClock();
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(""), 1600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const run = async (action: MockAction) => {
    try {
      await action.run();
      setFlash(`✓ ${action.label}`);
    } catch (error) {
      setFlash(`✕ ${(error as Error).message}`);
    }
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-lg hover:bg-amber-100"
      >
        <FlaskConical className="h-4 w-4" /> Mock controls
        {showClock && (
          <span className="font-mono font-normal">
            {new Date(now).toLocaleString("en-US", {
              timeZone,
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </button>
    );

  return (
    <aside
      aria-label="Mock controls"
      className="fixed bottom-4 right-4 z-50 max-h-[80vh] w-80 overflow-y-auto rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 shadow-2xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <FlaskConical className="h-4 w-4" /> Mock controls
        </span>
        <button type="button" aria-label="Close mock controls" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>
      {showClock && (
        <section className="mb-3">
          <h3 className="mb-1 font-semibold uppercase tracking-wide text-amber-700">Clock</h3>
          <p className="mb-2 font-mono text-sm">
            {new Date(now).toLocaleString("en-US", {
              timeZone,
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </p>
          <div className="flex flex-wrap gap-1">
            {[
              ["+5 min", 5 * MINUTE],
              ["+1 hour", HOUR],
              ["+1 day", DAY],
              ["+1 week", 7 * DAY],
            ].map(([label, ms]) => (
              <button
                key={label}
                type="button"
                onClick={() => clock.advance(ms as number)}
                className="rounded border border-amber-300 bg-white px-2 py-1 hover:bg-amber-100"
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      )}
      {sections.map((section) => (
        <section key={section.title} className="mb-3">
          <h3 className="mb-1 font-semibold uppercase tracking-wide text-amber-700">
            {section.title}
          </h3>
          <div className="flex flex-col gap-1">
            {section.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => void run(action)}
                className="rounded border border-amber-300 bg-white px-2 py-1 text-left hover:bg-amber-100"
              >
                {action.label}
                {action.hint && <span className="ml-1 text-amber-600">({action.hint})</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
      {onReset && (
        <button
          type="button"
          onClick={async () => {
            await onReset();
            window.location.reload();
          }}
          className="w-full rounded border border-red-300 bg-white px-2 py-1 text-red-700 hover:bg-red-50"
        >
          Reset local data
        </button>
      )}
      {flash && <p className="mt-2 text-amber-800">{flash}</p>}
    </aside>
  );
}

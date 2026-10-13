"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { newId } from "@/mock/events";
import type { ChecklistItem } from "@/types/ledger";

interface Props {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

/** Basic checklist editor: add, toggle, rename, and remove items. */
export function ChecklistEditor({ items, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const done = items.filter((item) => item.done).length;
  return (
    <section className="mt-8">
      <h2 className="mb-2 flex items-center justify-between text-sm font-semibold text-stone-700">
        Checklist
        {items.length > 0 && (
          <span className="text-xs font-normal text-stone-400">
            {done}/{items.length} done
          </span>
        )}
      </h2>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`Done: ${item.text}`}
              checked={item.done}
              onChange={() => onChange(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))}
            />
            <input
              aria-label="Checklist item"
              className={`flex-1 rounded px-1 py-0.5 text-sm outline-none hover:bg-stone-50 focus:bg-stone-50 ${item.done ? "text-stone-400 line-through" : ""}`}
              defaultValue={item.text}
              onBlur={(event) => {
                const text = event.target.value.trim();
                if (text && text !== item.text) onChange(items.map((i) => (i.id === item.id ? { ...i, text } : i)));
              }}
            />
            <button
              type="button"
              aria-label={`Remove ${item.text}`}
              className="invisible text-stone-400 hover:text-rose-600 group-hover:visible"
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2 text-sm text-stone-400"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          onChange([...items, { id: newId("c-"), text: draft.trim(), done: false }]);
          setDraft("");
        }}
      >
        <Plus className="h-4 w-4" />
        <input
          aria-label="New checklist item"
          className="flex-1 bg-transparent py-0.5 outline-none placeholder:text-stone-400"
          placeholder="Add an item"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </form>
    </section>
  );
}

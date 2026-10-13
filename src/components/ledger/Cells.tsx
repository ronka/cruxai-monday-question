"use client";

import { useEffect, useState } from "react";
import { people } from "@/data/ledgerData";
import type { CellValue, Field } from "@/types/ledger";

export const STATUS_COLORS: Record<string, string> = {
  "Not started": "bg-stone-200 text-stone-700",
  "In progress": "bg-sky-100 text-sky-800",
  Blocked: "bg-rose-100 text-rose-800",
  Done: "bg-emerald-100 text-emerald-800",
  "To do": "bg-stone-200 text-stone-700",
  Doing: "bg-amber-100 text-amber-800",
};

export function PersonChip({ id }: { id: string }) {
  const person = people.find((item) => item.id === id);
  if (!person) return <span className="text-stone-400">Unknown</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
        style={{ background: person.color }}
      >
        {person.initials}
      </span>
      {person.name}
    </span>
  );
}

export function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Read-only rendering of a cell value. */
export function CellDisplay({ field, value }: { field: Field; value: CellValue }) {
  if (value === null || value === undefined || value === "")
    return <span className="text-stone-300">Empty</span>;
  switch (field.type) {
    case "status":
      return (
        <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_COLORS[String(value)] ?? "bg-stone-100"}`}>
          {value}
        </span>
      );
    case "person":
      return <PersonChip id={String(value)} />;
    case "date":
      return <>{formatDate(String(value))}</>;
    case "number":
      return <span className="tabular-nums">{Number(value).toLocaleString()}</span>;
    case "title":
      return <span className="font-medium">{value}</span>;
    default:
      return <>{value}</>;
  }
}

interface EditorProps {
  field: Field;
  value: CellValue;
  onCommit: (value: CellValue) => void;
  onCancel: () => void;
}

/** Inline editor for a cell. Commits on Enter/blur/change, cancels on Escape. */
export function CellEditor({ field, value, onCommit, onCancel }: EditorProps) {
  const [draft, setDraft] = useState(value === null || value === undefined ? "" : String(value));
  useEffect(() => setDraft(value === null || value === undefined ? "" : String(value)), [value]);
  const className =
    "w-full rounded border border-sky-400 bg-white px-1.5 py-0.5 text-sm outline-none ring-2 ring-sky-100";
  const keys = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") onCancel();
    if (event.key === "Enter") (event.target as HTMLElement).blur();
  };

  if (field.type === "status" || field.type === "person") {
    const options =
      field.type === "status"
        ? field.options.map((option) => ({ value: option, label: option }))
        : people.map((person) => ({ value: person.id, label: person.name }));
    return (
      <select
        autoFocus
        aria-label={field.name}
        className={className}
        value={draft}
        onChange={(event) => onCommit(event.target.value || null)}
        onBlur={onCancel}
        onKeyDown={keys}
      >
        <option value="">Empty</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      autoFocus
      aria-label={field.name}
      className={className}
      type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={keys}
      onBlur={() => {
        if (draft === (value ?? "").toString()) return onCancel();
        onCommit(draft === "" ? null : field.type === "number" ? Number(draft) : draft);
      }}
    />
  );
}

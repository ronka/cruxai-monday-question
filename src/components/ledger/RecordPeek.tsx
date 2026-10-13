"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import type { CellValue, Field, LedgerRecord } from "@/types/ledger";
import { CellDisplay, CellEditor } from "./Cells";

interface Props {
  record: LedgerRecord | undefined;
  fields: Field[];
  onClose: () => void;
  onUpdate: (recordId: string, fieldId: string, value: CellValue) => void;
  onDelete: (recordId: string) => void;
}

/** Side peek showing one record's properties as an editable form. */
export function RecordPeek({ record, fields, onClose, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const title = fields.find((field) => field.type === "title");
  return (
    <aside
      aria-label="Record details"
      className="flex w-[420px] shrink-0 flex-col border-l border-stone-200 bg-white shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.12)]"
    >
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2 text-stone-500">
        <span className="text-xs">Record</span>
        <div className="flex gap-1">
          {record && (
            <button
              type="button"
              aria-label="Delete record"
              className="rounded p-1 hover:bg-rose-50 hover:text-rose-600"
              onClick={() => onDelete(record.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" aria-label="Close" className="rounded p-1 hover:bg-stone-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!record ? (
        <p className="p-6 text-sm text-stone-500">This record no longer exists.</p>
      ) : (
        <div className="overflow-y-auto px-8 py-6">
          {title && (
            <input
              key={record.id}
              aria-label="Title"
              className="mb-6 w-full text-3xl font-bold text-stone-900 outline-none placeholder:text-stone-300"
              placeholder="Untitled"
              defaultValue={String(record.values[title.id] ?? "")}
              onBlur={(event) => {
                if (event.target.value !== (record.values[title.id] ?? ""))
                  onUpdate(record.id, title.id, event.target.value || null);
              }}
            />
          )}
          <dl className="space-y-1 text-sm">
            {fields
              .filter((field) => field.type !== "title")
              .map((field) => (
                <div key={field.id} className="grid grid-cols-[140px_1fr] items-center gap-2">
                  <dt className="truncate text-stone-500">{field.name}</dt>
                  <dd
                    className="min-h-8 cursor-pointer rounded px-2 py-1 hover:bg-stone-100"
                    onClick={() => setEditing(field.id)}
                  >
                    {editing === field.id ? (
                      <CellEditor
                        field={field}
                        value={record.values[field.id] ?? null}
                        onCancel={() => setEditing(null)}
                        onCommit={(value) => {
                          setEditing(null);
                          onUpdate(record.id, field.id, value);
                        }}
                      />
                    ) : (
                      <CellDisplay field={field} value={record.values[field.id] ?? null} />
                    )}
                  </dd>
                </div>
              ))}
          </dl>
          <p className="mt-8 border-t border-stone-100 pt-4 text-xs text-stone-400">
            Last edited {new Date(record.updatedAt).toLocaleString("en-US")}
          </p>
        </div>
      )}
    </aside>
  );
}

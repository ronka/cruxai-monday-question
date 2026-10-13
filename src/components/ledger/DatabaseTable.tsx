"use client";

import { useMemo, useState } from "react";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Calendar, CircleDot, Hash, Maximize2, Text, Trash2, Type, User } from "lucide-react";
import type { CellValue, Field, LedgerRecord } from "@/types/ledger";
import { CellDisplay, CellEditor } from "./Cells";
import { people } from "@/data/ledgerData";

const ICONS = { title: Type, text: Text, status: CircleDot, date: Calendar, person: User, number: Hash };
const DEFAULT_WIDTH = { title: 280, text: 160, status: 140, date: 140, person: 170, number: 120 };
const STATUS_ORDER = (field: Field, value: CellValue) => field.options.indexOf(String(value));

interface Props {
  fields: Field[];
  records: LedgerRecord[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onUpdate: (recordId: string, fieldId: string, value: CellValue) => void;
  onOpen: (recordId: string) => void;
  onDeleteField: (field: Field) => void;
  /** Cells with a save in flight, keyed `${recordId}:${fieldId}`. */
  saving: Set<string>;
}

/**
 * Supplied table component (TanStack Table): typed cells, inline editing,
 * single-column sorting, and in-memory column resizing.
 */
export function DatabaseTable({ fields, records, sorting, onSortingChange, onUpdate, onOpen, onDeleteField, saving }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const columns = useMemo<ColumnDef<LedgerRecord>[]>(
    () =>
      fields.map((field) => ({
        id: field.id,
        size: DEFAULT_WIDTH[field.type],
        minSize: 90,
        header: field.name,
        accessorFn: (record) => record.values[field.id] ?? null,
        sortUndefined: "last",
        sortingFn: (a, b) => {
          const left = a.original.values[field.id];
          const right = b.original.values[field.id];
          if (left == null || left === "") return right == null || right === "" ? 0 : 1;
          if (right == null || right === "") return -1;
          if (field.type === "status") return STATUS_ORDER(field, left) - STATUS_ORDER(field, right);
          if (field.type === "number") return Number(left) - Number(right);
          if (field.type === "person")
            return (people.find((p) => p.id === left)?.name ?? "").localeCompare(
              people.find((p) => p.id === right)?.name ?? "",
            );
          return String(left).localeCompare(String(right));
        },
        meta: field,
      })),
    [fields],
  );

  const table = useReactTable({
    data: records,
    columns,
    getRowId: (record) => record.id,
    state: { sorting, columnSizing },
    onSortingChange: (updater) => onSortingChange(typeof updater === "function" ? updater(sorting) : updater),
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: "onChange",
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm" style={{ width: table.getTotalSize() }}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const field = header.column.columnDef.meta as Field;
                const Icon = ICONS[field.type];
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="group relative border-b border-r border-stone-200 px-2 py-1.5 text-left font-normal text-stone-500 last:border-r-0"
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded px-1 py-0.5 hover:bg-stone-100"
                        onClick={header.column.getToggleSortingHandler()}
                        title="Sort"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{field.name}</span>
                        {sorted === "asc" && <ArrowUp className="h-3 w-3 text-sky-600" />}
                        {sorted === "desc" && <ArrowDown className="h-3 w-3 text-sky-600" />}
                      </button>
                      {field.type !== "title" && (
                        <button
                          type="button"
                          aria-label={`Delete field ${field.name}`}
                          title="Delete field"
                          className="invisible rounded p-0.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 group-hover:visible"
                          onClick={() => onDeleteField(field)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-sky-300"
                    />
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="group/row hover:bg-stone-50">
              {row.getVisibleCells().map((cell) => {
                const field = cell.column.columnDef.meta as Field;
                const key = `${row.id}:${field.id}`;
                const value = cell.getValue() as CellValue;
                return (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className={`relative h-9 border-b border-r border-stone-200 px-2 last:border-r-0 ${saving.has(key) ? "opacity-60" : ""}`}
                    onClick={() => setEditing(key)}
                  >
                    {editing === key ? (
                      <CellEditor
                        field={field}
                        value={value}
                        onCancel={() => setEditing(null)}
                        onCommit={(next) => {
                          setEditing(null);
                          onUpdate(row.id, field.id, next);
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-2 truncate">
                        <CellDisplay field={field} value={value} />
                        {field.type === "title" && (
                          <button
                            type="button"
                            className="invisible flex items-center gap-1 rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs text-stone-500 group-hover/row:visible"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpen(row.id);
                            }}
                          >
                            <Maximize2 className="h-3 w-3" /> Open
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

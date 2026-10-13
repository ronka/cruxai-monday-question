"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { ChevronsLeft, FileText, Filter, Plus, Search, Settings, Table2 } from "lucide-react";
import {
  createRecord,
  deleteField,
  deleteRecord,
  failNextSave,
  getDatabase,
  getRecords,
  listDatabases,
  resetLedgerData,
  simulateCollaboratorEdit,
  subscribeToLedger,
  updateRecordValue,
} from "@/api/ledgerApi";
import { people } from "@/data/ledgerData";
import { MockControls } from "@/mock/MockControls";
import type { CellValue, Field } from "@/types/ledger";
import { DatabaseTable } from "./DatabaseTable";
import { RecordPeek } from "./RecordPeek";

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return { db: params.get("db") ?? "projects", record: params.get("record") };
}

export function LedgerApp() {
  const queryClient = useQueryClient();
  const [databaseId, setDatabaseId] = useState("projects");
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    const restore = () => {
      const url = readUrl();
      setDatabaseId(url.db);
      setOpenRecordId(url.record);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(
    () =>
      subscribeToLedger((event) => {
        void queryClient.invalidateQueries({ queryKey: ["records", event.databaseId] });
        if (event.type === "schema")
          void queryClient.invalidateQueries({ queryKey: ["database", event.databaseId] });
      }),
    [queryClient],
  );

  const databasesQuery = useQuery({ queryKey: ["databases"], queryFn: listDatabases });
  const databaseQuery = useQuery({ queryKey: ["database", databaseId], queryFn: () => getDatabase(databaseId) });
  const recordsQuery = useQuery({ queryKey: ["records", databaseId], queryFn: () => getRecords(databaseId) });
  const fields = useMemo(() => databaseQuery.data?.fields ?? [], [databaseQuery.data]);
  const statusField = fields.find((field) => field.type === "status");
  const records = useMemo(
    () =>
      (recordsQuery.data ?? []).filter(
        (record) => !statusFilter || !statusField || record.values[statusField.id] === statusFilter,
      ),
    [recordsQuery.data, statusFilter, statusField],
  );
  const openRecord = recordsQuery.data?.find((record) => record.id === openRecordId);

  function navigate(next: { db?: string; record?: string | null }) {
    const db = next.db ?? databaseId;
    const record = next.record === undefined ? openRecordId : next.record;
    setDatabaseId(db);
    setOpenRecordId(record);
    const params = new URLSearchParams({ db });
    if (record) params.set("record", record);
    window.history.pushState(null, "", `?${params}`);
  }

  async function update(recordId: string, fieldId: string, value: CellValue) {
    const key = `${recordId}:${fieldId}`;
    setSaving((current) => new Set(current).add(key));
    setError("");
    try {
      await updateRecordValue(recordId, fieldId, value);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["records", databaseId] });
    }
  }

  async function removeField(field: Field) {
    if (!window.confirm(`Delete the “${field.name}” field? Its values will be removed from every record.`)) return;
    try {
      await deleteField(field.id);
      if (sorting.some((sort) => sort.id === field.id)) setSorting([]);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  const database = databaseQuery.data?.database;
  return (
    <div className="flex h-dvh bg-white text-[14px] text-stone-800 [font-family:ui-sans-serif,-apple-system,'Segoe_UI',Helvetica,sans-serif]">
      <nav aria-label="Workspace" className="flex w-60 shrink-0 flex-col bg-[#f7f7f5] px-2 py-3 text-stone-600">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="flex items-center gap-2 font-semibold text-stone-800">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-stone-800 text-[11px] text-white">L</span>
            Lumen Labs
          </span>
          <ChevronsLeft className="h-4 w-4 text-stone-400" />
        </div>
        <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-200/60">
          <Search className="h-4 w-4" /> Search
        </div>
        <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-200/60">
          <Settings className="h-4 w-4" /> Settings
        </div>
        <p className="mb-1 mt-5 px-2 text-xs font-medium text-stone-400">Workspace</p>
        {databasesQuery.data?.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate({ db: item.id, record: null })}
            className={`flex items-center gap-2 rounded px-2 py-1 text-left ${item.id === databaseId ? "bg-stone-200/80 font-medium text-stone-900" : "hover:bg-stone-200/60"}`}
          >
            <span>{item.icon}</span> {item.name}
          </button>
        ))}
        <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-200/60">
          <FileText className="h-4 w-4" /> Team handbook
        </div>
        <div className="mt-auto px-2 text-xs text-stone-400">
          {people.length} members · Local workspace
        </div>
      </nav>

      <div className="flex min-w-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="px-24 pb-24 pt-16">
            {databaseQuery.isError ? (
              <div role="alert" className="text-rose-700">
                Could not load this database.{" "}
                <button className="underline" onClick={() => void databaseQuery.refetch()}>
                  Try again
                </button>
              </div>
            ) : (
              <>
                <div className="mb-2 text-5xl">{database?.icon ?? "📄"}</div>
                <h1 className="mb-1 text-4xl font-bold text-stone-900">{database?.name ?? "Loading…"}</h1>
                <p className="mb-6 text-stone-500">{database?.description}</p>
                <div className="mb-1 flex items-center justify-between border-b border-stone-200">
                  <span className="flex items-center gap-1.5 border-b-2 border-stone-800 px-1 pb-2 font-medium">
                    <Table2 className="h-4 w-4" /> Table
                  </span>
                  <div className="flex items-center gap-2 pb-1.5 text-stone-500">
                    {statusField && (
                      <label className="flex items-center gap-1 rounded px-2 py-1 hover:bg-stone-100">
                        <Filter className="h-3.5 w-3.5" />
                        <span className="sr-only">Filter by {statusField.name}</span>
                        <select
                          className="bg-transparent outline-none"
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value)}
                        >
                          <option value="">{statusField.name}: All</option>
                          {statusField.options.map((option) => (
                            <option key={option} value={option}>
                              {statusField.name}: {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {sorting[0] && (
                      <button
                        type="button"
                        className="rounded bg-sky-50 px-2 py-1 text-xs text-sky-700"
                        onClick={() => setSorting([])}
                        title="Clear sort"
                      >
                        Sorted by {fields.find((field) => field.id === sorting[0].id)?.name}{" "}
                        {sorting[0].desc ? "↓" : "↑"} ✕
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded bg-sky-600 px-2.5 py-1 font-medium text-white hover:bg-sky-700"
                      onClick={async () => {
                        const record = await createRecord(databaseId);
                        navigate({ record: record.id });
                      }}
                    >
                      <Plus className="h-4 w-4" /> New
                    </button>
                  </div>
                </div>
                {error && (
                  <p role="alert" className="my-2 rounded bg-rose-50 px-3 py-2 text-rose-700">
                    {error}
                  </p>
                )}
                {recordsQuery.isPending || databaseQuery.isPending ? (
                  <p role="status" className="py-8 text-stone-400">
                    Loading records…
                  </p>
                ) : (
                  <>
                    <DatabaseTable
                      fields={fields}
                      records={records}
                      sorting={sorting}
                      onSortingChange={setSorting}
                      onUpdate={update}
                      onOpen={(id) => navigate({ record: id })}
                      onDeleteField={removeField}
                      saving={saving}
                    />
                    {records.length === 0 && (
                      <p className="py-6 text-stone-400">No records match this filter.</p>
                    )}
                    <p className="mt-2 text-xs text-stone-400">
                      Count {records.length}
                      {statusFilter && ` of ${recordsQuery.data?.length}`}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </main>
        {openRecordId && (
          <RecordPeek
            record={openRecord}
            fields={fields}
            onClose={() => navigate({ record: null })}
            onUpdate={update}
            onDelete={async (id) => {
              await deleteRecord(id);
              navigate({ record: null });
            }}
          />
        )}
      </div>
      <MockControls
        sections={[
          {
            title: "Collaborators",
            actions: [{ label: "Teammate edits a record's status", run: () => simulateCollaboratorEdit(databaseId) }],
          },
          { title: "Failures", actions: [{ label: "Fail next cell save", run: failNextSave }] },
        ]}
        onReset={resetLedgerData}
      />
    </div>
  );
}

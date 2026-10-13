"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, ChevronsUpDown, Plus } from "lucide-react";
import { countChanges, diffLines, segmentRows, type DiffRow } from "@/lib/diff";
import type { ChangedFile, ReviewComment } from "@/types/review";

export interface LineRef {
  fileId: string;
  line: number;
  side: "new" | "old";
}

interface Props {
  file: ChangedFile;
  comments: ReviewComment[];
  /** Line whose composer is open, if it belongs to this file. */
  activeLine: LineRef | null;
  composer: ReactNode;
  onStartComment: (line: LineRef) => void;
  renderComment: (comment: ReviewComment) => ReactNode;
  /** Extra controls in the file header (right side). */
  headerActions?: ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const lineRef = (fileId: string, row: DiffRow): LineRef =>
  row.kind === "del" ? { fileId, line: row.oldLine, side: "old" } : { fileId, line: row.newLine, side: "new" };

const STATUS_LABEL = { added: "Added", removed: "Deleted", renamed: "Renamed", modified: "" };

/** Supplied unified diff renderer with expandable context and inline comment slots. */
export function FileDiff({ file, comments, activeLine, composer, onStartComment, renderComment, headerActions, collapsed, onToggleCollapsed }: Props) {
  const rows = useMemo(() => diffLines(file.baseContent, file.headContent), [file.baseContent, file.headContent]);
  const segments = useMemo(() => segmentRows(rows), [rows]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { additions, deletions } = countChanges(rows);

  const renderRow = (row: DiffRow, key: string) => {
    const ref = lineRef(file.fileId, row);
    const lineComments = comments.filter((c) => c.line === ref.line && c.side === ref.side && !c.outdated);
    const isActive = activeLine?.fileId === file.fileId && activeLine.line === ref.line && activeLine.side === ref.side;
    const bg = row.kind === "add" ? "bg-[#e6ffec]" : row.kind === "del" ? "bg-[#ffebe9]" : "";
    const gutter = row.kind === "add" ? "bg-[#ccffd8]" : row.kind === "del" ? "bg-[#ffd7d5]" : "text-neutral-400";
    return [
      <tr key={key} className={`group ${bg}`}>
        <td className={`w-12 select-none px-2 text-right align-top text-[12px] ${gutter}`}>{row.kind !== "add" ? row.oldLine : ""}</td>
        <td className={`relative w-12 select-none px-2 text-right align-top text-[12px] ${gutter}`}>
          {row.kind !== "del" ? row.newLine : ""}
          <button
            type="button"
            aria-label={`Comment on line ${ref.line}`}
            onClick={() => onStartComment(ref)}
            className="absolute -right-2.5 top-0 z-10 hidden h-5 w-5 items-center justify-center rounded bg-[#0969da] text-white group-hover:flex focus:flex"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </td>
        <td className="whitespace-pre-wrap break-all px-3 font-mono text-[12px] leading-5">
          <span className="select-none pr-2 text-neutral-500">{row.kind === "add" ? "+" : row.kind === "del" ? "-" : " "}</span>
          {row.text}
        </td>
      </tr>,
      ...(lineComments.length || isActive
        ? [
            <tr key={`${key}-comments`}>
              <td colSpan={3} className="border-y border-neutral-200 bg-white px-3 py-2">
                <div className="max-w-3xl space-y-2">
                  {lineComments.map((comment) => renderComment(comment))}
                  {isActive && composer}
                </div>
              </td>
            </tr>,
          ]
        : []),
    ];
  };

  return (
    <section id={`file-${file.fileId}`} className="overflow-hidden rounded-md border border-neutral-300">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-neutral-300 bg-[#f6f8fa] px-3 py-1.5 text-[12px]">
        <button type="button" aria-label={collapsed ? "Expand file" : "Collapse file"} onClick={onToggleCollapsed} className="rounded p-0.5 hover:bg-neutral-200">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span className="font-mono text-[12px] font-semibold">
          {file.previousPath && <span className="font-normal text-neutral-500">{file.previousPath} → </span>}
          {file.path}
        </span>
        {STATUS_LABEL[file.status] && <span className="rounded-full border border-neutral-300 px-1.5 text-[11px] text-neutral-600">{STATUS_LABEL[file.status]}</span>}
        <span className="text-[#1a7f37]">+{additions}</span>
        <span className="text-[#cf222e]">−{deletions}</span>
        <span className="ml-auto flex items-center gap-2">{headerActions}</span>
      </header>
      {!collapsed && (
        <table className="w-full border-collapse">
          <tbody>
            {segments.flatMap((segment, index) =>
              segment.visible || expanded.has(index)
                ? segment.rows.flatMap((row, i) => renderRow(row, `${index}-${i}`))
                : [
                    <tr key={`gap-${index}`} className="bg-[#ddf4ff]">
                      <td colSpan={3} className="px-2 py-0.5">
                        <button
                          type="button"
                          onClick={() => setExpanded((current) => new Set(current).add(index))}
                          className="flex items-center gap-1 text-[12px] text-[#0969da] hover:underline"
                        >
                          <ChevronsUpDown className="h-3.5 w-3.5" /> Expand {segment.rows.length} unchanged lines
                        </button>
                      </td>
                    </tr>,
                  ],
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

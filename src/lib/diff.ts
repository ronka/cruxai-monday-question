// Supplied line-diff engine (LCS). Produces unified-diff rows and hunks with
// collapsible context. Line numbers are 1-based.

export type DiffRow =
  | { kind: "context"; oldLine: number; newLine: number; text: string }
  | { kind: "add"; newLine: number; text: string }
  | { kind: "del"; oldLine: number; text: string };

export function diffLines(oldText: string, newText: string): DiffRow[] {
  const a = oldText === "" ? [] : oldText.split("\n");
  const b = newText === "" ? [] : newText.split("\n");
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      rows.push({ kind: "context", oldLine: i + 1, newLine: j + 1, text: a[i] });
      i++;
      j++;
    } else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      rows.push({ kind: "del", oldLine: i + 1, text: a[i] });
      i++;
    } else {
      rows.push({ kind: "add", newLine: j + 1, text: b[j] });
      j++;
    }
  }
  return rows;
}

export interface Segment {
  /** Rows shown by default (changes plus `context` lines around them). */
  visible: boolean;
  rows: DiffRow[];
}

/** Splits rows into visible hunks and hidden (expandable) context runs. */
export function segmentRows(rows: DiffRow[], context = 3): Segment[] {
  const keep = rows.map((row, index) =>
    row.kind !== "context" || rows.slice(Math.max(0, index - context), index + context + 1).some((other) => other.kind !== "context"),
  );
  const segments: Segment[] = [];
  rows.forEach((row, index) => {
    const last = segments[segments.length - 1];
    if (last && last.visible === keep[index]) last.rows.push(row);
    else segments.push({ visible: keep[index], rows: [row] });
  });
  return segments;
}

export function countChanges(rows: DiffRow[]) {
  return { additions: rows.filter((r) => r.kind === "add").length, deletions: rows.filter((r) => r.kind === "del").length };
}

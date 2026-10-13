export type FieldType = "title" | "text" | "status" | "date" | "person" | "number";

export interface Field {
  id: string;
  databaseId: string;
  name: string;
  type: FieldType;
  /** Allowed values for `status` fields, in display order. */
  options: string[];
  position: number;
}

export type CellValue = string | number | null;

export interface LedgerRecord {
  id: string;
  databaseId: string;
  /** Keyed by field ID. Missing keys are empty. */
  values: Record<string, CellValue>;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerDatabase {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Person {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export type LedgerEvent =
  | { type: "record"; databaseId: string; recordId: string }
  | { type: "schema"; databaseId: string };

import type { CellValue, Field, LedgerDatabase, Person } from "@/types/ledger";

export const people: Person[] = [
  { id: "ava", name: "Ava Patel", initials: "AP", color: "#d97757" },
  { id: "ben", name: "Ben Okafor", initials: "BO", color: "#5b8def" },
  { id: "chloe", name: "Chloe Martin", initials: "CM", color: "#3fa37a" },
  { id: "diego", name: "Diego Alvarez", initials: "DA", color: "#a66cd9" },
  { id: "emma", name: "Emma Lindqvist", initials: "EL", color: "#d4a72c" },
];

export const databases: LedgerDatabase[] = [
  {
    id: "projects",
    name: "Projects",
    icon: "🗂️",
    description: "Everything the product team is working on this half.",
  },
];

export const STATUS_OPTIONS = ["Not started", "In progress", "Blocked", "Done"];

export const initialFields: Field[] = [
  { id: "f-title", databaseId: "projects", name: "Name", type: "title", options: [], position: 0 },
  { id: "f-status", databaseId: "projects", name: "Status", type: "status", options: STATUS_OPTIONS, position: 1 },
  { id: "f-owner", databaseId: "projects", name: "Owner", type: "person", options: [], position: 2 },
  { id: "f-due", databaseId: "projects", name: "Due", type: "date", options: [], position: 3 },
  { id: "f-team", databaseId: "projects", name: "Team", type: "text", options: [], position: 4 },
  { id: "f-budget", databaseId: "projects", name: "Budget (k$)", type: "number", options: [], position: 5 },
];

const rows: [string, string, string, string, string, number][] = [
  ["Onboarding checklist redesign", "In progress", "ava", "2026-10-28", "Growth", 40],
  ["Billing page migration", "Not started", "ben", "2026-11-14", "Payments", 65],
  ["Search relevance tuning", "In progress", "chloe", "2026-10-21", "Discovery", 30],
  ["Mobile offline mode", "Blocked", "diego", "2026-12-05", "Mobile", 120],
  ["Accessibility audit fixes", "Done", "emma", "2026-10-02", "Platform", 18],
  ["Team workspace permissions", "In progress", "ben", "2026-11-03", "Platform", 55],
  ["Weekly digest email", "Done", "ava", "2026-09-26", "Growth", 12],
  ["Usage-based pricing experiment", "Not started", "chloe", "2026-12-12", "Payments", 80],
  ["Dark mode polish", "In progress", "emma", "2026-10-24", "Design systems", 15],
  ["Import from CSV", "Blocked", "diego", "2026-11-20", "Platform", 45],
  ["Customer health dashboard", "Not started", "ava", "2026-11-30", "Growth", 70],
  ["Keyboard shortcuts overhaul", "Done", "chloe", "2026-09-30", "Design systems", 10],
  ["Audit log export", "In progress", "ben", "2026-11-09", "Platform", 35],
  ["Localized onboarding (ES, DE)", "Not started", "emma", "2026-12-18", "Growth", 50],
];

export const initialRecords: {
  id: string;
  databaseId: string;
  values: Record<string, CellValue>;
  checklist?: { id: string; text: string; done: boolean }[];
}[] =
  rows.map(([title, status, owner, due, team, budget], index) => ({
    id: `p-${index + 1}`,
    databaseId: "projects",
    values: {
      "f-title": title,
      "f-status": status,
      "f-owner": owner,
      "f-due": due,
      "f-team": team,
      "f-budget": budget,
    },
    checklist:
      index === 0
        ? [
            { id: "c-1", text: "Interview five new customers", done: true },
            { id: "c-2", text: "Draft checklist states", done: true },
            { id: "c-3", text: "Usability test with prototype", done: false },
          ]
        : index === 3
          ? [
              { id: "c-4", text: "Agree on conflict policy", done: false },
              { id: "c-5", text: "Spike local queue", done: false },
            ]
          : [],
  }));

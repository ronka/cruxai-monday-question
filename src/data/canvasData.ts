import type { Artboard, Layer } from "@/types/canvas";

export const CURRENT_USER = { id: "kai", name: "Kai Moreno", initials: "KM", color: "#0d99ff" };
export const COLLABORATORS = [
  CURRENT_USER,
  { id: "ines", name: "Inês Duarte", initials: "ID", color: "#9747ff" },
  { id: "ravi", name: "Ravi Shah", initials: "RS", color: "#14ae5c" },
];

const BRAND = "#4f46e5";
const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";

const text = (x: number, y: number, value: string, size = 14, weight = 400, fill = INK, width?: number): Layer => ({ kind: "text", x, y, text: value, size, weight, fill, width });
const rect = (x: number, y: number, width: number, height: number, fill: string, radius = 0, stroke?: string): Layer => ({ kind: "rect", x, y, width, height, fill, radius, stroke });

function phoneChrome(title: string): Layer[] {
  return [rect(0, 0, 375, 44, "#ffffff"), text(20, 28, "9:41", 14, 600), rect(0, 44, 375, 56, "#ffffff"), text(20, 80, title, 20, 700)];
}

const login: Layer[] = [
  ...phoneChrome(""),
  { kind: "ellipse", x: 155, y: 130, width: 64, height: 64, fill: BRAND },
  text(110, 240, "Welcome back", 26, 700),
  text(76, 270, "Sign in to continue to Lumina", 15, 400, MUTED),
  text(24, 330, "Email", 13, 600, MUTED),
  rect(24, 340, 327, 48, "#ffffff", 10, LINE),
  text(40, 370, "kai@lumina.design", 15, 400, INK),
  text(24, 418, "Password", 13, 600, MUTED),
  rect(24, 428, 327, 48, "#ffffff", 10, LINE),
  text(40, 458, "••••••••••", 15, 400, INK),
  text(240, 500, "Forgot password?", 13, 600, BRAND),
  rect(24, 530, 327, 52, BRAND, 12),
  text(155, 562, "Sign in", 16, 700, "#ffffff"),
  text(92, 760, "New here? Create an account", 14, 400, MUTED),
];

const home: Layer[] = [
  ...phoneChrome("Good morning, Kai"),
  rect(20, 120, 335, 150, BRAND, 18),
  text(40, 160, "Weekly progress", 15, 600, "#c7d2fe"),
  text(40, 205, "72%", 40, 800, "#ffffff"),
  rect(40, 230, 295, 8, "#6366f1", 4),
  rect(40, 230, 212, 8, "#ffffff", 4),
  text(20, 310, "Today", 18, 700),
  ...[0, 1, 2, 3].flatMap((i) => [
    rect(20, 330 + i * 84, 335, 72, "#ffffff", 14, LINE),
    { kind: "ellipse" as const, x: 36, y: 346 + i * 84, width: 40, height: 40, fill: ["#fde68a", "#bbf7d0", "#fecaca", "#bfdbfe"][i] },
    text(92, 362 + i * 84, ["Morning standup", "Review onboarding", "Lunch with Ravi", "Ship release notes"][i], 15, 600),
    text(92, 384 + i * 84, ["9:30 – 9:45", "10:00 – 11:30", "12:30 – 13:30", "16:00 – 16:30"][i], 13, 400, MUTED),
  ]),
  rect(0, 740, 375, 72, "#ffffff", 0, LINE),
  ...[0, 1, 2, 3].map((i) => ({ kind: "ellipse" as const, x: 40 + i * 90, y: 760, width: 24, height: 24, fill: i === 0 ? BRAND : "#d1d5db" })),
];

const dashboard: Layer[] = [
  rect(0, 0, 240, 900, "#0f172a"),
  text(28, 48, "Lumina", 20, 800, "#ffffff"),
  ...["Overview", "Projects", "Team", "Reports", "Settings"].map((label, i) => text(28, 110 + i * 44, label, 15, i === 0 ? 700 : 400, i === 0 ? "#ffffff" : "#94a3b8")),
  text(280, 64, "Overview", 28, 800),
  text(280, 92, "Tuesday, October 13", 14, 400, MUTED),
  ...[0, 1, 2].flatMap((i) => [
    rect(280 + i * 300, 124, 280, 120, "#ffffff", 16, LINE),
    text(304 + i * 300, 160, ["Active projects", "Hours logged", "Satisfaction"][i], 14, 500, MUTED),
    text(304 + i * 300, 208, ["24", "1,284", "94%"][i], 34, 800),
  ]),
  rect(280, 272, 580, 300, "#ffffff", 16, LINE),
  text(304, 308, "Activity", 16, 700),
  ...Array.from({ length: 12 }, (_, i) => rect(312 + i * 44, 540 - [80, 120, 95, 160, 140, 190, 170, 210, 180, 230, 200, 250][i], 26, [80, 120, 95, 160, 140, 190, 170, 210, 180, 230, 200, 250][i], i === 11 ? BRAND : "#c7d2fe", 6)),
  rect(880, 272, 280, 300, "#ffffff", 16, LINE),
  text(904, 308, "Team", 16, 700),
  ...[0, 1, 2, 3].flatMap((i) => [
    { kind: "ellipse" as const, x: 904, y: 334 + i * 56, width: 36, height: 36, fill: ["#fca5a5", "#93c5fd", "#86efac", "#fcd34d"][i] },
    text(952, 357 + i * 56, ["Inês Duarte", "Ravi Shah", "Kai Moreno", "Mia Chen"][i], 14, 600),
  ]),
  rect(280, 600, 880, 260, "#ffffff", 16, LINE),
  text(304, 636, "Recent projects", 16, 700),
  ...[0, 1, 2].flatMap((i) => [rect(304, 660 + i * 60, 832, 1, LINE), text(304, 696 + i * 60, ["Mobile onboarding", "Billing redesign", "Marketing site"][i], 14, 600), text(1040, 696 + i * 60, ["On track", "At risk", "Done"][i], 13, 600, ["#16a34a", "#dc2626", MUTED][i])]),
];

const settings: Layer[] = [
  rect(0, 0, 1200, 64, "#ffffff", 0, LINE),
  text(32, 40, "Settings", 20, 800),
  ...["Profile", "Notifications", "Security", "Billing", "Integrations"].map((label, i) => [rect(24, 96 + i * 44, 200, 36, i === 0 ? "#eef2ff" : "#ffffff", 8), text(40, 120 + i * 44, label, 14, i === 0 ? 700 : 400, i === 0 ? BRAND : INK)]).flat(),
  rect(256, 96, 900, 520, "#ffffff", 16, LINE),
  text(288, 140, "Profile", 20, 700),
  { kind: "ellipse", x: 288, y: 168, width: 80, height: 80, fill: "#fcd34d" },
  rect(392, 190, 140, 36, "#ffffff", 8, LINE),
  text(412, 213, "Change photo", 14, 600),
  ...["Full name", "Email", "Role", "Time zone"].flatMap((label, i) => [
    text(288 + (i % 2) * 420, 300 + Math.floor(i / 2) * 96, label, 13, 600, MUTED),
    rect(288 + (i % 2) * 420, 312 + Math.floor(i / 2) * 96, 400, 44, "#ffffff", 8, LINE),
    text(304 + (i % 2) * 420, 340 + Math.floor(i / 2) * 96, ["Kai Moreno", "kai@lumina.design", "Product designer", "Europe/Lisbon"][i], 14),
  ]),
  rect(1000, 548, 128, 44, BRAND, 10),
  text(1030, 576, "Save", 15, 700, "#ffffff"),
];

const pricing: Layer[] = [
  text(470, 90, "Simple pricing", 40, 800),
  text(430, 130, "Start free. Upgrade when your team grows.", 18, 400, MUTED),
  ...[0, 1, 2].flatMap((i) => [
    rect(120 + i * 340, 180, 300, 420, i === 1 ? BRAND : "#ffffff", 20, i === 1 ? undefined : LINE),
    text(152 + i * 340, 230, ["Starter", "Team", "Enterprise"][i], 18, 700, i === 1 ? "#ffffff" : INK),
    text(152 + i * 340, 290, ["$0", "$12", "Custom"][i], 44, 800, i === 1 ? "#ffffff" : INK),
    ...[0, 1, 2, 3].map((j) => text(152 + i * 340, 350 + j * 36, ["Unlimited files", "Version history", "Comments", "SSO & audit logs"][j], 15, 400, i === 1 ? "#e0e7ff" : j > i + 1 ? "#d1d5db" : MUTED)),
    rect(152 + i * 340, 520, 236, 48, i === 1 ? "#ffffff" : "#f3f4f6", 12),
    text(220 + i * 340, 550, i === 2 ? "Contact us" : "Get started", 15, 700, i === 1 ? BRAND : INK),
  ]),
];

export const seedArtboards: Artboard[] = [
  { id: "ab-login", name: "Login — Mobile", x: 0, y: 0, width: 375, height: 812, background: "#f9fafb", layers: login },
  { id: "ab-home", name: "Home — Mobile", x: 455, y: 0, width: 375, height: 812, background: "#f3f4f6", layers: home },
  { id: "ab-dashboard", name: "Dashboard — Desktop", x: 910, y: 0, width: 1200, height: 900, background: "#f8fafc", layers: dashboard },
  { id: "ab-settings", name: "Settings — Desktop", x: 1240, y: 1000, width: 1200, height: 660, background: "#f9fafb", layers: settings },
  { id: "ab-pricing", name: "Pricing — Web", x: 0, y: 1000, width: 1140, height: 660, background: "#ffffff", layers: pricing },
];

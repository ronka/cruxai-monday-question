import type { Agent, Customer } from "@/types/helpdesk";

export const agents: Agent[] = [
  { id: "olivia", name: "Olivia Park", initials: "OP", color: "#286efa" },
  { id: "marcus", name: "Marcus Webb", initials: "MW", color: "#e2652b" },
  { id: "sana", name: "Sana Iqbal", initials: "SI", color: "#0b9b6b" },
];
export const DEFAULT_AGENT_ID = "olivia";

export const customers: Customer[] = [
  { id: "cu-1", name: "Hannah Lee", email: "hannah@brightloop.io", company: "Brightloop", plan: "Pro", location: "Toronto, CA", color: "#7c3aed" },
  { id: "cu-2", name: "Tomás Rivera", email: "tomas@cartwheel.mx", company: "Cartwheel", plan: "Enterprise", location: "Mexico City, MX", color: "#db2777" },
  { id: "cu-3", name: "Grace Okoye", email: "grace@finchpay.ng", company: "FinchPay", plan: "Free", location: "Lagos, NG", color: "#0891b2" },
  { id: "cu-4", name: "Lukas Weber", email: "lukas@oakline.de", company: "Oakline", plan: "Pro", location: "Berlin, DE", color: "#65a30d" },
  { id: "cu-5", name: "Mei Chen", email: "mei@harborly.com", company: "Harborly", plan: "Enterprise", location: "Singapore, SG", color: "#ea580c" },
  { id: "cu-6", name: "Aarav Shah", email: "aarav@quillstack.in", company: "Quillstack", plan: "Free", location: "Pune, IN", color: "#4f46e5" },
  { id: "cu-7", name: "Elena Rossi", email: "elena@verdant.it", company: "Verdant", plan: "Pro", location: "Milan, IT", color: "#be123c" },
  { id: "cu-8", name: "Noah Williams", email: "noah@ridgeback.co", company: "Ridgeback", plan: "Pro", location: "Denver, US", color: "#0f766e" },
];

type Thread = { customer: string; subject: string; status: "open" | "closed"; minutesAgo: number; messages: [kind: "customer" | "agent", author: string, body: string][] };

export const seedThreads: Thread[] = [
  { customer: "cu-1", subject: "Can't export reports to CSV", status: "open", minutesAgo: 4, messages: [
    ["customer", "cu-1", "Hi! The Export button on the Reports page just spins forever."],
    ["agent", "marcus", "Thanks Hannah — which browser are you using?"],
    ["customer", "cu-1", "Chrome 129 on a Mac. Same thing in Safari though."],
  ] },
  { customer: "cu-2", subject: "SSO login failing for new users", status: "open", minutesAgo: 12, messages: [
    ["customer", "cu-2", "Anyone we added this week gets 'invalid assertion' when signing in with Okta."],
  ] },
  { customer: "cu-3", subject: "Billing question", status: "open", minutesAgo: 35, messages: [
    ["customer", "cu-3", "If I upgrade mid-month, am I charged the full price?"],
    ["agent", "olivia", "You'll only pay the prorated difference for the rest of the month."],
    ["customer", "cu-3", "Great, and does the free trial still apply?"],
  ] },
  { customer: "cu-4", subject: "Webhook deliveries delayed", status: "open", minutesAgo: 58, messages: [
    ["customer", "cu-4", "Our webhooks are arriving 10–15 minutes late since this morning."],
  ] },
  { customer: "cu-5", subject: "Need an invoice with our VAT number", status: "open", minutesAgo: 95, messages: [
    ["customer", "cu-5", "Could you reissue invoice INV-2291 with VAT ID SG-88123?"],
    ["agent", "sana", "Of course — I've asked our finance team, you'll have it today."],
  ] },
  { customer: "cu-6", subject: "How do I invite my team?", status: "open", minutesAgo: 140, messages: [
    ["customer", "cu-6", "Where is the invite button? I can't find it in settings."],
  ] },
  { customer: "cu-7", subject: "Dark mode contrast", status: "open", minutesAgo: 300, messages: [
    ["customer", "cu-7", "The grey text in dark mode is really hard to read on the dashboard."],
    ["agent", "olivia", "Thanks Elena, I've shared this with our design team."],
  ] },
  { customer: "cu-8", subject: "Password reset email never arrives", status: "closed", minutesAgo: 1440, messages: [
    ["customer", "cu-8", "I requested a reset three times and got nothing."],
    ["agent", "marcus", "It looks like your mail server rejected us — I've sent a reset link directly."],
    ["customer", "cu-8", "Got it, thank you!"],
  ] },
  { customer: "cu-1", subject: "Feature request: scheduled reports", status: "closed", minutesAgo: 4320, messages: [
    ["customer", "cu-1", "Would love to email a weekly report automatically."],
    ["agent", "sana", "Great idea — I've added your vote to the request."],
  ] },
];

export const incomingSamples = [
  "Any update on this?",
  "Thanks, that worked!",
  "I attached a screenshot — does that help?",
  "Actually, it's happening again.",
  "Could someone call me about this today?",
];

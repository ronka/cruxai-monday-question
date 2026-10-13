import { PRIORITIES, STATUSES, TRIAGE_STATUS, users } from "@/data/trackerData";
import type { IssueStatus, Priority } from "@/types/tracker";

export function StatusIcon({ status, size = 14 }: { status: IssueStatus; size?: number }) {
  const meta = STATUSES.find((item) => item.id === status) ?? TRIAGE_STATUS;
  const fill = { triage: 0.25, backlog: 0, todo: 0, in_progress: 0.5, in_review: 0.75, done: 1, canceled: 1 }[status];
  const r = 5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-label={meta.label} role="img">
      <circle cx="7" cy="7" r="6" fill="none" stroke={meta.color} strokeWidth="1.5" strokeDasharray={status === "backlog" ? "2 2" : undefined} />
      {fill > 0 && status !== "canceled" && (
        <circle cx="7" cy="7" r={r / 2} fill="none" stroke={meta.color} strokeWidth={r} strokeDasharray={`${(c / 2) * fill} ${c}`} transform="rotate(-90 7 7)" />
      )}
      {status === "canceled" && <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke={meta.color} strokeWidth="1.5" />}
    </svg>
  );
}

export function PriorityIcon({ priority }: { priority: Priority }) {
  const label = PRIORITIES.find((item) => item.id === priority)!.label;
  if (priority === 1)
    return (
      <span aria-label={label} title={label} className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-orange-500 text-[10px] font-bold text-white">
        !
      </span>
    );
  if (priority === 0)
    return <span aria-label={label} title={label} className="w-3.5 text-center text-zinc-400">···</span>;
  const bars = 5 - priority;
  return (
    <span aria-label={label} title={label} className="flex h-3.5 w-3.5 items-end gap-[1.5px]">
      {[1, 2, 3].map((bar) => (
        <span key={bar} className={`w-[3px] rounded-sm ${bar <= bars ? "bg-zinc-600" : "bg-zinc-300"}`} style={{ height: 4 + bar * 3 }} />
      ))}
    </span>
  );
}

export function Avatar({ userId, size = 18 }: { userId: string | null; size?: number }) {
  const user = users.find((item) => item.id === userId);
  if (!user)
    return <span className="inline-block rounded-full border border-dashed border-zinc-400" style={{ width: size, height: size }} aria-label="Unassigned" />;
  return (
    <span
      title={user.name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.42 }}
    >
      {user.initials}
    </span>
  );
}

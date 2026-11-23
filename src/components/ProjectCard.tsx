"use client";
import Link from "next/link";
import { Ring, STATUS_STYLE } from "./ui";
import { CalendarClock } from "lucide-react";
import { fmtDate } from "@/lib/dates";

export default function ProjectCard({ p }: { p: any }) {
  const st = STATUS_STYLE[p.status] || STATUS_STYLE.active;
  return (
    <Link href={`/projects/${p.id}`} className="card p-5 flex flex-col gap-4 hover:-translate-y-0.5 transition relative overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: p.color }} />
      <div className="flex items-start gap-3">
        <div className="relative">
          <Ring value={p.pct} size={56} stroke={6} color={p.color} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-display">{p.pct}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-heading truncate">{p.name}</div>
          <div className="text-xs text-muted truncate">{p.description || p.category}</div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip" style={{ color: st.color, background: `${st.color}18` }}>{st.label}</span>
        <span className="chip">{p.phases?.[p.phase] ?? "—"}</span>
        {p.tasksTotal > 0 && <span className="chip">{p.tasksDone}/{p.tasksTotal} tasks</span>}
        {p.deadline && <span className="chip"><CalendarClock size={11} /> {fmtDate(p.deadline, { day: "numeric", month: "short" })}</span>}
      </div>
      {/* Phase track */}
      <div className="flex gap-1">
        {(p.phases || []).map((ph: string, i: number) => (
          <span key={ph + i} title={ph} className="h-1.5 flex-1 rounded-full" style={{ background: i <= p.phase ? p.color : "var(--surface-2)", opacity: i < p.phase ? 0.55 : 1 }} />
        ))}
      </div>
    </Link>
  );
}

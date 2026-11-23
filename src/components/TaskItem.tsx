"use client";
import { Check, Repeat, Bell, CalendarClock, ListChecks, ArrowRight } from "lucide-react";
import type { Occurrence } from "@/lib/tasks";
import { fmtTime, fmtDate, addDays } from "@/lib/dates";
import { api, localToday } from "@/lib/client";
import { useApp } from "./Providers";
import { PRIORITY_COLOR } from "./ui";
import Link from "next/link";

export default function TaskItem({ t, showDate, compact, hideProject }: { t: Occurrence; showDate?: boolean; compact?: boolean; hideProject?: boolean }) {
  const { openTask, toast } = useApp();
  const today = localToday();
  const late = !t.done && t.occ && t.occ < today;

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const r = await api<{ done: boolean }>(`/api/tasks/${t.id}/toggle`, "POST", { occ: t.occ });
    if (r.done) toast(`Done: ${t.title} 🎉`);
  }
  async function moveTomorrow(e: React.MouseEvent) {
    e.stopPropagation();
    await api(`/api/tasks/${t.id}`, "PATCH", { date: late ? today : addDays(t.occ!, 1) });
    toast(late ? "Moved to today" : "Moved to the next day");
  }
  const subDone = t.subtasks.filter((s) => s.done).length;

  return (
    <div
      onClick={() => openTask(t)}
      className={`group flex items-start gap-3 rounded-2xl ${compact ? "px-2 py-2" : "px-3 py-2.5"} hover:bg-surface-2 cursor-pointer transition`}
    >
      <button
        onClick={toggle}
        aria-label={t.done ? "Mark not done" : "Mark done"}
        className={`mt-0.5 size-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${t.done ? "bg-brand-gradient border-transparent text-white" : "hover:border-[#2639e8]"}`}
        style={t.done ? undefined : { borderColor: PRIORITY_COLOR[t.priority] }}
      >
        {t.done && <Check size={12} strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium leading-snug ${t.done ? "line-through text-muted" : "text-fg"}`}>{t.title}</div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-muted">
          {showDate && t.occ && <span className={late ? "text-red-500 font-semibold" : ""}>{t.occ === today ? "Today" : fmtDate(t.occ)}</span>}
          {t.time && <span className="font-semibold text-fg/80">{fmtTime(t.time)}</span>}
          {t.repeat !== "none" && <Repeat size={11} />}
          {t.time && t.remindBefore >= 0 && !t.done && <Bell size={11} />}
          {t.subtasks.length > 0 && <span className="inline-flex items-center gap-1"><ListChecks size={11} />{subDone}/{t.subtasks.length}</span>}
          {!hideProject && t.project && (
            <Link href={`/projects/${t.project.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:underline">
              <span className="size-2 rounded-full" style={{ background: t.project.color }} />
              {t.project.name}
            </Link>
          )}
        </div>
      </div>
      {!t.done && t.occ && t.repeat === "none" && (
        <button onClick={moveTomorrow} title="Move to next day" className="opacity-0 group-hover:opacity-100 text-muted hover:text-fg transition p-1">
          {late ? <CalendarClock size={16} /> : <ArrowRight size={16} />}
        </button>
      )}
    </div>
  );
}

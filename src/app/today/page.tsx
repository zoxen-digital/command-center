"use client";
import { useEffect, useRef, useState } from "react";
import { useApi, api, localToday, showNotice } from "@/lib/client";
import { fmtDate, fmtTime, toMinutes, addDays } from "@/lib/dates";
import type { Occurrence } from "@/lib/tasks";
import TaskItem from "@/components/TaskItem";
import { Empty, SetupError, Progress } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { ChevronLeft, ChevronRight, Plus, Inbox, Timer, Play, Pause, RotateCcw, AlertTriangle } from "lucide-react";

const START_H = 6;
const END_H = 24;
const PX = 56; // pixels per hour

export default function TodayPage() {
  const [day, setDay] = useState(localToday());
  const today = localToday();
  const { data, error } = useApi<Occurrence[]>(`/api/tasks?from=${day}&to=${day}`);
  const { data: late } = useApi<Occurrence[]>(day === today ? "/api/tasks?view=overdue" : null);
  const { data: back } = useApi<Occurrence[]>("/api/tasks?view=backlog");
  const { openTask, toast } = useApp();
  const [nowMin, setNowMin] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const upd = () => { const d = new Date(); setNowMin(d.getHours() * 60 + d.getMinutes()); };
    upd();
    const t = setInterval(upd, 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, ((new Date().getHours() - START_H - 1) * PX));
  }, [data === null]);

  if (error) return <SetupError error={error} />;
  const items = data || [];
  const timed = items.filter((t) => t.time);
  const anytime = items.filter((t) => !t.time);
  const done = items.filter((t) => t.done).length;

  async function schedule(t: Occurrence) {
    await api(`/api/tasks/${t.id}`, "PATCH", { date: day });
    toast(`Planned for ${day === today ? "today" : fmtDate(day)}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn btn-outline !w-10 !px-0" onClick={() => setDay(addDays(day, -1))}><ChevronLeft size={18} /></button>
          <div className="min-w-56 text-center">
            <h1 className="text-2xl font-extrabold text-heading">{day === today ? "Today" : day === addDays(today, 1) ? "Tomorrow" : day === addDays(today, -1) ? "Yesterday" : fmtDate(day, { weekday: "long" })}</h1>
            <p className="text-xs text-muted">{fmtDate(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <button className="btn btn-outline !w-10 !px-0" onClick={() => setDay(addDays(day, 1))}><ChevronRight size={18} /></button>
          {day !== today && <button className="btn btn-ghost btn-sm" onClick={() => setDay(today)}>Back to today</button>}
        </div>
        <button className="btn btn-primary" onClick={() => openTask({ date: day })}><Plus size={16} /> Add to this day</button>
      </div>

      <div className="card p-4 flex items-center gap-4">
        <div className="text-sm font-semibold whitespace-nowrap">{done}/{items.length} done</div>
        <div className="flex-1"><Progress value={items.length ? (done / items.length) * 100 : 0} /></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-heading mb-3">Schedule</h2>
          <div ref={scroller} className="relative overflow-y-auto max-h-[640px] no-scrollbar">
            <div className="relative" style={{ height: (END_H - START_H) * PX }}>
              {Array.from({ length: END_H - START_H }, (_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-line/70 flex" style={{ top: i * PX }}>
                  <span className="text-[11px] text-muted w-14 -mt-2 bg-surface pr-2">{fmtTime(`${String(START_H + i).padStart(2, "0")}:00`).replace(":00", "")}</span>
                  <button className="flex-1 h-14 hover:bg-surface-2/60 rounded-lg" title="Add task at this hour"
                    onClick={() => openTask({ date: day, time: `${String(START_H + i).padStart(2, "0")}:00` })} />
                </div>
              ))}
              {day === today && nowMin >= START_H * 60 && (
                <div className="absolute left-12 right-0 z-10 flex items-center pointer-events-none" style={{ top: ((nowMin - START_H * 60) / 60) * PX }}>
                  <span className="size-2.5 rounded-full bg-red-500 -ml-1" /><span className="flex-1 h-0.5 bg-red-500" />
                </div>
              )}
              {timed.map((t) => {
                const top = Math.max(0, ((toMinutes(t.time!) - START_H * 60) / 60) * PX);
                const h = Math.max(30, (t.duration / 60) * PX - 4);
                const color = t.project?.color || "#2639e8";
                return (
                  <div key={t.id} className="absolute left-16 right-1 rounded-xl overflow-hidden" style={{ top: top + 2, height: h, background: `${color}14`, borderLeft: `4px solid ${color}` }}>
                    <div className="scale-[0.98] origin-top-left"><TaskItem t={t} compact /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <FocusTimer />
          <section className="card p-5">
            <h2 className="font-bold text-heading mb-2">Any time today</h2>
            {anytime.length === 0 ? <p className="text-sm text-muted py-2">No untimed tasks.</p> : anytime.map((t) => <TaskItem key={t.id} t={t} />)}
          </section>
          {day === today && late && late.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold text-red-500 mb-2 flex items-center gap-2"><AlertTriangle size={16} /> Overdue</h2>
              {late.map((t) => <TaskItem key={t.id} t={t} showDate />)}
            </section>
          )}
          <section className="card p-5">
            <h2 className="font-bold text-heading mb-1 flex items-center gap-2"><Inbox size={16} /> Backlog</h2>
            <p className="text-xs text-muted mb-2">Click + to plan a task on this day.</p>
            {!back?.length && <Empty text="Backlog is empty." />}
            {back?.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0"><TaskItem t={t} compact /></div>
                <button className="btn btn-ghost btn-sm !px-2" onClick={() => schedule(t)} title="Plan on this day"><Plus size={16} /></button>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function FocusTimer() {
  const MODES = { focus: 25, short: 5, long: 15 } as const;
  const [mode, setMode] = useState<keyof typeof MODES>("focus");
  const [left, setLeft] = useState(MODES.focus * 60);
  const [run, setRun] = useState(false);
  const { toast } = useApp();

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setLeft((l) => {
      if (l <= 1) {
        setRun(false);
        const msg = mode === "focus" ? "Focus session done! Take a break ☕" : "Break over — back to work 💪";
        toast(msg);
        showNotice("⏱ Focus timer", msg);
        return 0;
      }
      return l - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [run, mode, toast]);

  useEffect(() => {
    document.title = run ? `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")} · Focus` : "Today | Zoxen";
  }, [left, run]);

  const pick = (m: keyof typeof MODES) => { setMode(m); setLeft(MODES[m] * 60); setRun(false); };
  return (
    <section className="card p-5">
      <h2 className="font-bold text-heading mb-3 flex items-center gap-2"><Timer size={16} className="text-[#6c3bf5]" /> Focus timer</h2>
      <div className="flex gap-1 mb-4">
        {(["focus", "short", "long"] as const).map((m) => (
          <button key={m} onClick={() => pick(m)} className={`btn btn-sm flex-1 ${mode === m ? "btn-primary" : "btn-outline"}`}>{m === "focus" ? "Focus 25" : m === "short" ? "Break 5" : "Long 15"}</button>
        ))}
      </div>
      <div className="text-5xl font-display font-extrabold text-center text-heading tabular-nums">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</div>
      <div className="flex justify-center gap-2 mt-4">
        <button className="btn btn-primary" onClick={() => setRun(!run)}>{run ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Start</>}</button>
        <button className="btn btn-outline" onClick={() => pick(mode)}><RotateCcw size={16} /></button>
      </div>
    </section>
  );
}

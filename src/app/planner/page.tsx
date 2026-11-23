"use client";
import { useState } from "react";
import { useApi, api, localToday } from "@/lib/client";
import { addDays, fmtDate, weekStart } from "@/lib/dates";
import type { Occurrence } from "@/lib/tasks";
import TaskItem from "@/components/TaskItem";
import { SetupError } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { ChevronLeft, ChevronRight, Plus, Inbox } from "lucide-react";

export default function Planner() {
  const today = localToday();
  const [start, setStart] = useState(weekStart(today));
  const end = addDays(start, 6);
  const { data, error } = useApi<Occurrence[]>(`/api/tasks?from=${start}&to=${end}`);
  const { data: back } = useApi<Occurrence[]>("/api/tasks?view=backlog");
  const { openTask, toast } = useApp();
  const [over, setOver] = useState<string | null>(null);

  if (error) return <SetupError error={error} />;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const total = data?.length || 0;
  const done = data?.filter((t) => t.done).length || 0;

  async function drop(e: React.DragEvent, day: string | null) {
    e.preventDefault();
    setOver(null);
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const { id, repeat } = JSON.parse(raw);
    if (repeat !== "none") return toast("Repeating tasks: edit the task to change its days", "err");
    await api(`/api/tasks/${id}`, "PATCH", { date: day });
    toast(day ? `Moved to ${fmtDate(day)}` : "Moved to backlog");
  }

  const drag = (t: Occurrence) => (e: React.DragEvent) => e.dataTransfer.setData("text/plain", JSON.stringify({ id: t.id, repeat: t.repeat }));
  const zone = (key: string, day: string | null) => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(key); },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => drop(e, day),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Week planner</h1>
          <p className="text-sm text-muted">{fmtDate(start, { day: "numeric", month: "short" })} – {fmtDate(end, { day: "numeric", month: "short", year: "numeric" })} · {done}/{total} done · drag tasks between days</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline !w-10 !px-0" onClick={() => setStart(addDays(start, -7))}><ChevronLeft size={18} /></button>
          <button className="btn btn-outline" onClick={() => setStart(weekStart(today))}>This week</button>
          <button className="btn btn-outline !w-10 !px-0" onClick={() => setStart(addDays(start, 7))}><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {days.map((d) => {
          const items = (data || []).filter((t) => t.occ === d);
          const isToday = d === today;
          return (
            <section key={d} {...zone(d, d)}
              className={`card p-3 min-h-52 flex flex-col transition ${isToday ? "ring-2 ring-[#2639e8]/60" : ""} ${over === d ? "ring-2 ring-[#6c3bf5]" : ""} ${d < today ? "opacity-80" : ""}`}>
              <div className="flex items-center justify-between px-1 mb-2">
                <div>
                  <div className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-gradient" : "text-muted"}`}>{fmtDate(d, { weekday: "long" })}</div>
                  <div className="text-lg font-display font-bold text-heading leading-tight">{fmtDate(d, { day: "numeric", month: "short" })}</div>
                </div>
                <button className="btn btn-ghost btn-sm !px-2" onClick={() => openTask({ date: d })} title="Add task"><Plus size={16} /></button>
              </div>
              <div className="flex-1 space-y-0.5">
                {items.map((t) => (
                  <div key={t.id + d} draggable onDragStart={drag(t)}><TaskItem t={t} compact /></div>
                ))}
                {items.length === 0 && <button onClick={() => openTask({ date: d })} className="w-full text-xs text-muted py-6 rounded-xl border border-dashed border-line hover:text-fg">+ Plan something</button>}
              </div>
            </section>
          );
        })}
        <section {...zone("backlog", null)} className={`card p-3 min-h-52 ${over === "backlog" ? "ring-2 ring-[#6c3bf5]" : ""}`}>
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2 font-bold text-heading"><Inbox size={16} /> Backlog</div>
            <button className="btn btn-ghost btn-sm !px-2" onClick={() => openTask({ date: null })}><Plus size={16} /></button>
          </div>
          <p className="text-[11px] text-muted px-1 mb-2">Drag onto a day to plan it.</p>
          {back?.map((t) => <div key={t.id} draggable onDragStart={drag(t)}><TaskItem t={t} compact /></div>)}
        </section>
      </div>
    </div>
  );
}

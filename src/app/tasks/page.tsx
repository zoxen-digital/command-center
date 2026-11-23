"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi, localToday } from "@/lib/client";
import { addDays } from "@/lib/dates";
import type { Occurrence } from "@/lib/tasks";
import TaskItem from "@/components/TaskItem";
import { Empty, SetupError } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { Plus, Search, ListTodo } from "lucide-react";

const VIEWS = [
  { key: "upcoming", label: "Upcoming (30 days)" },
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "backlog", label: "Backlog" },
  { key: "past", label: "Last 30 days" },
] as const;

export default function TasksPage() {
  return <Suspense><Tasks /></Suspense>;
}

function Tasks() {
  const sp = useSearchParams();
  const [view, setView] = useState<string>(sp.get("view") || "upcoming");
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("");
  const [hideDone, setHideDone] = useState(true);
  const today = localToday();
  const { openTask } = useApp();
  const { data: projects } = useApi<any[]>("/api/projects");

  const url =
    view === "overdue" ? "/api/tasks?view=overdue"
    : view === "backlog" ? "/api/tasks?view=backlog&done=1"
    : view === "today" ? `/api/tasks?from=${today}&to=${today}`
    : view === "past" ? `/api/tasks?from=${addDays(today, -30)}&to=${addDays(today, -1)}`
    : `/api/tasks?from=${today}&to=${addDays(today, 30)}`;
  const { data, error, loading } = useApi<Occurrence[]>(url + (project ? `&projectId=${project}` : ""));

  if (error) return <SetupError error={error} />;
  let items = (data || []).filter((t) =>
    (!q || (t.title + t.notes).toLowerCase().includes(q.toLowerCase())) && (!priority || t.priority === priority) && (!hideDone || !t.done));
  if (view === "past") items = [...items].reverse();

  // group by day for dated views
  const groups = items.reduce<[string, Occurrence[]][]>((acc, t) => {
    const k = t.occ || "Backlog";
    const last = acc[acc.length - 1];
    if (last && last[0] === k) last[1].push(t);
    else acc.push([k, [t]]);
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-heading">Tasks</h1>
        <button className="btn btn-primary" onClick={() => openTask(view === "backlog" ? { date: null } : undefined)}><Plus size={16} /> New task</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => setView(v.key)} className={`btn btn-sm ${view === v.key ? "btn-primary" : "btn-outline"}`}>{v.label}</button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-9" placeholder="Search tasks…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">All projects</option>
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input !w-auto" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Any priority</option>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[#2639e8] size-4" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide done</label>
      </div>

      <div className="card p-4">
        {loading && <p className="text-sm text-muted p-4">Loading…</p>}
        {!loading && items.length === 0 && <Empty icon={<ListTodo size={36} />} text="No tasks here." />}
        {groups.map(([k, list]) => (
          <div key={k} className="mb-4 last:mb-0">
            {view !== "today" && (
              <div className={`text-[11px] font-bold uppercase tracking-wide px-3 mb-1 ${k < today && k !== "Backlog" && view !== "past" ? "text-red-500" : "text-muted"}`}>
                {k === "Backlog" ? "Backlog" : k === today ? "Today" : k === addDays(today, 1) ? "Tomorrow" : new Date(k + "T00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
              </div>
            )}
            {list.map((t) => <TaskItem key={t.id + t.occ} t={t} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

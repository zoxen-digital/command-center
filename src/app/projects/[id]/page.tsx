"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApi, api } from "@/lib/client";
import { fmtDate } from "@/lib/dates";
import type { Occurrence } from "@/lib/tasks";
import TaskItem from "@/components/TaskItem";
import ProjectModal from "@/components/ProjectModal";
import { useApp } from "@/components/Providers";
import { Empty, Ring, SetupError, STATUS_STYLE } from "@/components/ui";
import { ArrowLeft, Pencil, Trash2, Plus, Lightbulb, CalendarDays, AlertTriangle, ExternalLink, Folder, Check, StickyNote, History } from "lucide-react";

type Detail = { project: any; upcoming: Occurrence[]; overdue: Occurrence[]; backlog: Occurrence[]; notes: any[]; activity: any[] };

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useApi<Detail>(`/api/projects/${id}`);
  const [edit, setEdit] = useState(false);
  const [idea, setIdea] = useState("");
  const [note, setNote] = useState("");
  const { openTask, toast } = useApp();
  const router = useRouter();

  if (error) return <SetupError error={error} />;
  if (!data) return <div className="card h-64 animate-pulse" />;
  const p = data.project;
  const st = STATUS_STYLE[p.status];
  const openBacklog = data.backlog.filter((t) => !t.done);
  const doneBacklog = data.backlog.filter((t) => t.done);

  async function setPhase(i: number) {
    await api(`/api/projects/${id}`, "PATCH", { phase: i });
    toast(`Phase: ${p.phases[i]}`);
  }
  async function addIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;
    await api("/api/tasks", "POST", { title: idea.trim(), projectId: id, date: null });
    setIdea("");
  }
  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await api("/api/notes", "POST", { body: note.trim(), projectId: id });
    setNote("");
  }
  async function remove() {
    if (!confirm(`Delete "${p.name}" and all its tasks?`)) return;
    await api(`/api/projects/${id}`, "DELETE");
    toast("Project deleted");
    router.push("/projects");
  }

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-sm text-muted hover:text-fg inline-flex items-center gap-1"><ArrowLeft size={14} /> Projects</Link>

      <div className="card p-6 relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: p.color }} />
        <div className="flex flex-wrap items-start gap-5">
          <div className="relative"><Ring value={p.pct} size={92} stroke={9} color={p.color} /><span className="absolute inset-0 flex items-center justify-center text-xl font-display font-extrabold">{p.pct}%</span></div>
          <div className="flex-1 min-w-60">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="chip" style={{ color: st.color, background: `${st.color}18` }}>{st.label}</span>
              <span className="chip">{p.category}</span>
              <span className="chip">Priority: {p.priority}</span>
              {p.deadline && <span className="chip"><CalendarDays size={11} /> Due {fmtDate(p.deadline)}</span>}
            </div>
            <h1 className="text-3xl font-extrabold text-heading">{p.name}</h1>
            {p.description && <p className="text-sm text-muted mt-1 max-w-2xl">{p.description}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted">
              {p.folder && <span className="inline-flex items-center gap-1"><Folder size={12} /> {p.folder}</span>}
              {p.url && <a href={p.url} target="_blank" className="inline-flex items-center gap-1 hover:text-fg"><ExternalLink size={12} /> {p.url.replace(/^https?:\/\//, "")}</a>}
              <span>{p.tasksDone}/{p.tasksTotal} tasks done</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</button>
            <button className="btn btn-danger !px-3" onClick={remove}><Trash2 size={15} /></button>
          </div>
        </div>

        {/* Phase stepper */}
        <div className="mt-6 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {p.phases.map((ph: string, i: number) => {
            const state = i < p.phase ? "done" : i === p.phase ? "now" : "next";
            return (
              <div key={ph + i} className="flex items-center gap-1 flex-1 min-w-28">
                <button onClick={() => setPhase(i)} title="Set as current phase"
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold w-full transition ${state === "now" ? "text-white" : state === "done" ? "text-fg bg-surface-2" : "text-muted border border-dashed border-line hover:text-fg"}`}
                  style={state === "now" ? { background: p.color } : undefined}>
                  <span className={`size-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${state === "now" ? "bg-white/25" : state === "done" ? "" : "bg-surface-2"}`} style={state === "done" ? { background: p.color, color: "#fff" } : undefined}>
                    {state === "done" ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="truncate">{ph}</span>
                </button>
                {i < p.phases.length - 1 && <span className="w-3 h-0.5 bg-line shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {data.overdue.length > 0 && (
            <section className="card p-5">
              <h2 className="font-bold text-red-500 mb-2 flex items-center gap-2"><AlertTriangle size={16} /> Overdue</h2>
              {data.overdue.map((t) => <TaskItem key={t.id} t={t} showDate hideProject />)}
            </section>
          )}
          <section className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-heading flex items-center gap-2"><CalendarDays size={16} /> Scheduled (next 30 days)</h2>
              <button className="btn btn-primary btn-sm" onClick={() => openTask({ projectId: id })}><Plus size={14} /> Task</button>
            </div>
            {data.upcoming.length === 0 ? <Empty text="Nothing scheduled. Plan items from the backlog onto days." /> : data.upcoming.map((t) => <TaskItem key={t.id + t.occ} t={t} showDate hideProject />)}
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-heading mb-1 flex items-center gap-2"><Lightbulb size={16} className="text-amber-500" /> Backlog — what to add next</h2>
            <p className="text-xs text-muted mb-3">Features, ideas and to-dos without a date. Open one to give it a day and time.</p>
            <form onSubmit={addIdea} className="flex gap-2 mb-3">
              <input className="input" placeholder="e.g. Add dark mode to settings page" value={idea} onChange={(e) => setIdea(e.target.value)} />
              <button className="btn btn-outline" disabled={!idea.trim()}><Plus size={16} /> Add</button>
            </form>
            {openBacklog.map((t) => <TaskItem key={t.id} t={t} hideProject />)}
            {doneBacklog.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-muted cursor-pointer px-3">Completed ({doneBacklog.length})</summary>
                {doneBacklog.map((t) => <TaskItem key={t.id} t={t} hideProject />)}
              </details>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold text-heading mb-3 flex items-center gap-2"><StickyNote size={16} /> Notes</h2>
            <form onSubmit={addNote} className="space-y-2 mb-3">
              <textarea className="input" rows={2} placeholder="Decision, link, idea…" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn btn-outline btn-sm w-full" disabled={!note.trim()}>Save note</button>
            </form>
            <div className="space-y-2">
              {data.notes.map((n) => (
                <div key={n._id} className="group rounded-xl bg-surface-2 p-3 text-sm relative">
                  {n.title && <div className="font-semibold">{n.title}</div>}
                  <div className="whitespace-pre-wrap">{n.body}</div>
                  <div className="text-[10px] text-muted mt-1">{new Date(n.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                  <button onClick={() => api(`/api/notes/${n._id}`, "DELETE")} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="font-bold text-heading mb-3 flex items-center gap-2"><History size={16} /> History</h2>
            {data.activity.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
            <ul className="space-y-2">
              {data.activity.map((a) => (
                <li key={a._id} className="text-sm flex gap-2"><span className="size-1.5 rounded-full mt-2 shrink-0" style={{ background: p.color }} /><span className="flex-1">{a.text}</span><span className="text-[11px] text-muted">{fmtDate(a.day, { day: "numeric", month: "short" })}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <ProjectModal open={edit} project={p} onClose={() => setEdit(false)} />
    </div>
  );
}

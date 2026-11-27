"use client";
import { useEffect, useState } from "react";
import { Modal } from "./ui";
import { api, useApi, localToday } from "@/lib/client";
import type { Occurrence } from "@/lib/tasks";
import { Check, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useApp } from "./Providers";

const EMPTY = {
  title: "", notes: "", projectId: "", date: "", time: "", duration: 30, repeat: "none", until: "",
  priority: "medium", remindBefore: 10, subtasks: [] as { title: string; done: boolean }[],
};

export default function TaskModal({ initial, onClose }: { initial: Partial<Occurrence> | null; onClose: () => void }) {
  const open = initial !== null;
  const editing = !!initial?.id;
  const [f, setF] = useState(EMPTY);
  const [sub, setSub] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();
  const { data: projects } = useApi<any[]>(open ? "/api/projects" : null);

  useEffect(() => {
    if (!initial) return;
    setF({
      ...EMPTY,
      ...Object.fromEntries(Object.entries(initial).filter(([, v]) => v !== null && v !== undefined)),
      date: initial.id ? initial.date || "" : initial.date === undefined ? localToday() : initial.date || "",
      projectId: initial.projectId || "",
    } as typeof EMPTY);
    setSub("");
  }, [initial]);

  const set = (k: keyof typeof EMPTY, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, subtasks: sub.trim() ? [...f.subtasks, { title: sub.trim(), done: false }] : f.subtasks, duration: Number(f.duration), remindBefore: Number(f.remindBefore) };
      if (!body.date) body.repeat = "none";
      if (editing) await api(`/api/tasks/${initial!.id}`, "PATCH", body);
      else await api("/api/tasks", "POST", body);
      toast(editing ? "Task updated" : "Task added");
      onClose();
    } catch (err) {
      toast((err as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone() {
    try {
      const r = await api<{ done: boolean }>(`/api/tasks/${initial!.id}/toggle`, "POST", { occ: initial!.occ ?? null });
      toast(r.done ? `Done: ${f.title} 🎉` : "Marked as not done");
      onClose();
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  async function remove() {
    if (!confirm(f.repeat !== "none" ? "Delete this repeating task (all days)?" : "Delete this task?")) return;
    await api(`/api/tasks/${initial!.id}`, "DELETE");
    toast("Task deleted");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit task" : "New task"}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <input autoFocus className="input !h-12 !text-base font-semibold" placeholder="What needs to be done?" value={f.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={f.date} onChange={(e) => set("date", e.target.value)} />
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {[["Today", 0], ["Tomorrow", 1], ["No date", null]].map(([l, n]) => (
                <button type="button" key={l as string} className="chip hover:text-fg" onClick={() => {
                  if (n === null) return set("date", "");
                  const d = new Date(); d.setDate(d.getDate() + (n as number));
                  set("date", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={f.time} onChange={(e) => set("time", e.target.value)} disabled={!f.date} />
          </div>
          <div>
            <label className="label">Project</label>
            <select className="input" value={f.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">— Personal / none —</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={f.priority} onChange={(e) => set("priority", e.target.value)}>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          {f.date && (
            <>
              <div>
                <label className="label">Repeat</label>
                <select className="input" value={f.repeat} onChange={(e) => set("repeat", e.target.value)}>
                  <option value="none">Does not repeat</option>
                  <option value="daily">Every day</option>
                  <option value="weekdays">Mon – Fri</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </select>
              </div>
              <div>
                <label className="label">Reminder</label>
                <select className="input" value={f.remindBefore} onChange={(e) => set("remindBefore", Number(e.target.value))} disabled={!f.time}>
                  <option value={-1}>No reminder</option>
                  <option value={0}>At start time</option>
                  <option value={5}>5 min before</option>
                  <option value={10}>10 min before</option>
                  <option value={15}>15 min before</option>
                  <option value={30}>30 min before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                </select>
              </div>
              {f.repeat !== "none" && (
                <div>
                  <label className="label">Repeat until (optional)</label>
                  <input type="date" className="input" value={f.until} onChange={(e) => set("until", e.target.value)} />
                </div>
              )}
              {f.time && (
                <div>
                  <label className="label">Duration</label>
                  <select className="input" value={f.duration} onChange={(e) => set("duration", Number(e.target.value))}>
                    {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </div>
        {!f.date && <p className="text-xs text-muted -mt-1">No date = goes to the backlog (“to do later”). Plan it on a day when you are ready.</p>}

        <div>
          <label className="label">Checklist</label>
          <div className="space-y-1.5">
            {f.subtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.done} onChange={() => set("subtasks", f.subtasks.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} className="accent-[#2639e8] size-4" />
                <span className={`flex-1 ${s.done ? "line-through text-muted" : ""}`}>{s.title}</span>
                <button type="button" className="text-muted hover:text-red-500" onClick={() => set("subtasks", f.subtasks.filter((_, j) => j !== i))}><X size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input !h-9" placeholder="Add a step…" value={sub} onChange={(e) => setSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (sub.trim()) { set("subtasks", [...f.subtasks, { title: sub.trim(), done: false }]); setSub(""); }
                  }
                }} />
              <button type="button" className="btn btn-outline btn-sm !h-9" onClick={() => { if (sub.trim()) { set("subtasks", [...f.subtasks, { title: sub.trim(), done: false }]); setSub(""); } }}><Plus size={14} /></button>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} placeholder="Details, links, anything…" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          {editing && <button type="button" className="btn btn-danger !px-3" onClick={remove} aria-label="Delete task"><Trash2 size={16} /></button>}
          {editing && (
            <button type="button" className={`btn ${initial!.done ? "btn-outline" : "bg-emerald-500 text-white hover:bg-emerald-600"}`} onClick={toggleDone}>
              {initial!.done ? <><RotateCcw size={16} /> Not done</> : <><Check size={16} strokeWidth={3} /> Done</>}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !f.title.trim()}>{busy ? "Saving…" : editing ? "Save" : "Add task"}</button>
        </div>
      </form>
    </Modal>
  );
}

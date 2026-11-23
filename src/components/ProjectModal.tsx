"use client";
import { useEffect, useState } from "react";
import { Modal } from "./ui";
import { api } from "@/lib/client";
import { useApp } from "./Providers";

const COLORS = ["#2639e8", "#6c3bf5", "#e5484d", "#f59e0b", "#10b981", "#0ea5e9", "#ec4899", "#14b8a6", "#64748b"];
const BLANK = { name: "", description: "", category: "Software", status: "active", phases: "Planning, Design, Build, Testing, Launch", phase: 0, color: COLORS[0], folder: "", url: "", deadline: "", priority: "medium", manual: false, progress: 0 };

export default function ProjectModal({ open, project, onClose, onSaved }: { open: boolean; project?: any; onClose: () => void; onSaved?: (p: any) => void }) {
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();

  useEffect(() => {
    if (!open) return;
    setF(project ? {
      ...BLANK, ...project, phases: (project.phases || []).join(", "), deadline: project.deadline || "",
      manual: typeof project.progress === "number", progress: project.progress ?? project.pct ?? 0,
    } : BLANK);
  }, [open, project]);
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const phases = f.phases.split(",").map((s) => s.trim()).filter(Boolean);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, phases, phase: Math.min(Number(f.phase), phases.length - 1), progress: f.manual ? Number(f.progress) : null };
      const saved = project ? await api(`/api/projects/${project.id}`, "PATCH", body) : await api("/api/projects", "POST", body);
      toast(project ? "Project saved" : "Project created");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast((err as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={project ? "Edit project" : "New project"} wide>
      <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><label className="label">Name</label><input autoFocus className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Description</label><textarea rows={2} className="input" value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
        <div><label className="label">Category</label>
          <input className="input" list="cats" value={f.category} onChange={(e) => set("category", e.target.value)} />
          <datalist id="cats">{["Software", "Website", "App", "Game", "AI", "Internal", "Client", "Personal", "Learning"].map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div><label className="label">Status</label>
          <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="idea">Idea</option><option value="active">Active</option><option value="paused">On hold</option><option value="done">Completed</option>
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Phases (comma separated)</label><input className="input" value={f.phases} onChange={(e) => set("phases", e.target.value)} /></div>
        <div><label className="label">Current phase</label>
          <select className="input" value={f.phase} onChange={(e) => set("phase", Number(e.target.value))}>
            {phases.map((p, i) => <option key={p + i} value={i}>{i + 1}. {p}</option>)}
          </select>
        </div>
        <div><label className="label">Priority</label>
          <select className="input" value={f.priority} onChange={(e) => set("priority", e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        </div>
        <div><label className="label">Deadline</label><input type="date" className="input" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></div>
        <div><label className="label">Folder / repo</label><input className="input" placeholder="e.g. Game" value={f.folder} onChange={(e) => set("folder", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Live URL</label><input className="input" placeholder="https://" value={f.url} onChange={(e) => set("url", e.target.value)} /></div>
        <div className="sm:col-span-2">
          <label className="label">Color</label>
          <div className="flex gap-2">{COLORS.map((c) => <button type="button" key={c} onClick={() => set("color", c)} className={`size-8 rounded-full transition ${f.color === c ? "ring-2 ring-offset-2 ring-offset-surface scale-110" : ""}`} style={{ background: c, ["--tw-ring-color" as string]: c }} />)}</div>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="accent-[#2639e8] size-4" checked={f.manual} onChange={(e) => set("manual", e.target.checked)} /> Set progress manually (otherwise from completed tasks)</label>
          {f.manual && <div className="flex items-center gap-3 mt-2"><input type="range" min={0} max={100} step={5} className="flex-1 accent-[#2639e8]" value={f.progress} onChange={(e) => set("progress", Number(e.target.value))} /><b className="w-12 text-right">{f.progress}%</b></div>}
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || !f.name.trim()}>{busy ? "Saving…" : "Save project"}</button>
        </div>
      </form>
    </Modal>
  );
}

"use client";
import { useState } from "react";
import { useApi, api } from "@/lib/client";
import { Empty, SetupError } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { Pin, Trash2, Search, StickyNote, ListPlus } from "lucide-react";

export default function NotesPage() {
  const { data, error } = useApi<any[]>("/api/notes");
  const { data: projects } = useApi<any[]>("/api/projects");
  const [f, setF] = useState({ title: "", body: "", projectId: "" });
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const { toast } = useApp();

  if (error) return <SetupError error={error} />;
  const pmap = new Map((projects || []).map((p) => [p.id, p]));
  const list = (data || []).filter((n) => !q || `${n.title} ${n.body}`.toLowerCase().includes(q.toLowerCase()));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/notes", "POST", { ...f, projectId: f.projectId || null });
      setF({ title: "", body: "", projectId: f.projectId });
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }
  async function toTask(n: any) {
    await api("/api/tasks", "POST", { title: n.title || n.body.split("\n")[0].slice(0, 120), notes: n.title ? n.body : "", projectId: n.projectId, date: null });
    toast("Added to backlog as a task");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-heading">Notes & Ideas</h1>
        <p className="text-sm text-muted">Get it out of your head. Write it down here, then turn it into a task when you are ready.</p>
      </div>

      <form onSubmit={add} className="card p-5 space-y-3">
        <input className="input !border-0 !shadow-none !px-0 font-semibold !text-base" placeholder="Title (optional)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input" rows={3} placeholder="Idea, thought, meeting note, link…" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) add(e); }} />
        <div className="flex flex-wrap gap-2 items-center">
          <select className="input !w-auto" value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>
            <option value="">No project</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="text-xs text-muted">Ctrl + Enter to save</span>
          <button className="btn btn-primary ml-auto" disabled={!f.title.trim() && !f.body.trim()}>Save note</button>
        </div>
      </form>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input !pl-9" placeholder="Search notes…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {data && list.length === 0 && <div className="card"><Empty icon={<StickyNote size={36} />} text="No notes yet." /></div>}
      <div className="columns-1 md:columns-2 xl:columns-3 gap-4 [&>*]:mb-4">
        {list.map((n) => {
          const proj = n.projectId ? pmap.get(n.projectId) : null;
          return (
            <div key={n._id} className="card p-4 break-inside-avoid group" style={proj ? { borderTop: `3px solid ${proj.color}` } : undefined}>
              {editing === n._id ? (
                <EditNote n={n} onDone={() => setEditing(null)} />
              ) : (
                <div onClick={() => setEditing(n._id)} className="cursor-text">
                  {n.title && <div className="font-bold text-heading mb-1">{n.title}</div>}
                  <div className="text-sm whitespace-pre-wrap break-words">{n.body}</div>
                </div>
              )}
              <div className="flex items-center gap-2 mt-3 text-[11px] text-muted">
                {proj && <span className="chip" style={{ color: proj.color }}>{proj.name}</span>}
                <span>{new Date(n.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                <div className="ml-auto flex gap-1 opacity-60 group-hover:opacity-100">
                  <button title="Turn into task" onClick={() => toTask(n)} className="p-1 hover:text-fg"><ListPlus size={14} /></button>
                  <button title="Pin" onClick={() => api(`/api/notes/${n._id}`, "PATCH", { pinned: !n.pinned })} className={`p-1 hover:text-fg ${n.pinned ? "text-[#2639e8]" : ""}`}><Pin size={14} /></button>
                  <button title="Delete" onClick={() => confirm("Delete note?") && api(`/api/notes/${n._id}`, "DELETE")} className="p-1 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditNote({ n, onDone }: { n: any; onDone: () => void }) {
  const [t, setT] = useState(n.title);
  const [b, setB] = useState(n.body);
  async function save() {
    if (t !== n.title || b !== n.body) await api(`/api/notes/${n._id}`, "PATCH", { title: t, body: b });
    onDone();
  }
  return (
    <div className="space-y-2">
      <input className="input !h-9 font-semibold" value={t} placeholder="Title" onChange={(e) => setT(e.target.value)} />
      <textarea autoFocus className="input text-sm" rows={5} value={b} onChange={(e) => setB(e.target.value)} />
      <div className="flex justify-end gap-2"><button className="btn btn-ghost btn-sm" onClick={onDone}>Cancel</button><button className="btn btn-primary btn-sm" onClick={save}>Save</button></div>
    </div>
  );
}

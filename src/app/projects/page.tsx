"use client";
import { useState } from "react";
import { useApi } from "@/lib/client";
import ProjectCard from "@/components/ProjectCard";
import ProjectModal from "@/components/ProjectModal";
import { SetupError, STATUS_STYLE, Empty } from "@/components/ui";
import { Plus, LayoutGrid, Columns3 } from "lucide-react";

export default function ProjectsPage() {
  const { data, error } = useApi<any[]>("/api/projects");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [board, setBoard] = useState(false);

  if (error) return <SetupError error={error} />;
  const list = (data || []).filter((p) => filter === "all" || p.status === filter);
  const avg = data?.length ? Math.round(data.reduce((n, p) => n + p.pct, 0) / data.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Projects</h1>
          <p className="text-sm text-muted">{data?.length || 0} projects · {avg}% average progress</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline !w-10 !px-0" onClick={() => setBoard(!board)} title={board ? "Grid view" : "Board view"}>{board ? <LayoutGrid size={16} /> : <Columns3 size={16} />}</button>
          <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New project</button>
        </div>
      </div>

      {!board && (
        <div className="flex flex-wrap gap-2">
          {["all", "active", "idea", "paused", "done"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? "btn-primary" : "btn-outline"}`}>
              {s === "all" ? "All" : STATUS_STYLE[s].label} <span className="opacity-70">{s === "all" ? data?.length || 0 : data?.filter((p) => p.status === s).length || 0}</span>
            </button>
          ))}
        </div>
      )}

      {board ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(["idea", "active", "paused", "done"] as const).map((s) => (
            <div key={s} className="space-y-3">
              <div className="flex items-center gap-2 px-1 font-bold text-sm"><span className="size-2.5 rounded-full" style={{ background: STATUS_STYLE[s].color }} />{STATUS_STYLE[s].label}</div>
              {data?.filter((p) => p.status === s).map((p) => <ProjectCard key={p.id} p={p} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => <ProjectCard key={p.id} p={p} />)}
          {data && list.length === 0 && <div className="card sm:col-span-2 xl:col-span-3"><Empty text="No projects in this list." /></div>}
        </div>
      )}
      <ProjectModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

import { Task, Project, plain } from "./db";
import { addDays, occursOn } from "./dates";

export type Occurrence = {
  id: string;
  title: string;
  notes: string;
  projectId: string | null;
  project?: { id: string; name: string; color: string } | null;
  date: string | null; // the original start date
  occ: string | null; // the day this occurrence falls on
  time: string | null;
  duration: number;
  repeat: string;
  until: string | null;
  priority: string;
  remindBefore: number;
  done: boolean;
  subtasks: { title: string; done: boolean }[];
};

type Raw = Record<string, any>;

async function projectMap() {
  const ps = await Project.find({}, { name: 1, color: 1 }).lean();
  return new Map(ps.map((p: Raw) => [String(p._id), { id: String(p._id), name: p.name, color: p.color }]));
}

function toOcc(t: Raw, occ: string | null, pm: Map<string, any>): Occurrence {
  const pid = t.projectId ? String(t.projectId) : null;
  return {
    id: String(t._id), title: t.title, notes: t.notes || "", projectId: pid, project: pid ? pm.get(pid) || null : null,
    date: t.date, occ, time: t.time, duration: t.duration ?? 30, repeat: t.repeat || "none", until: t.until,
    priority: t.priority, remindBefore: t.remindBefore ?? 10,
    done: (t.doneDates || []).includes(occ ?? "backlog"),
    subtasks: plain(t.subtasks || []),
  };
}

export function sortOcc(a: Occurrence, b: Occurrence) {
  if ((a.occ || "") !== (b.occ || "")) return (a.occ || "9999").localeCompare(b.occ || "9999");
  if (a.done !== b.done) return a.done ? 1 : -1;
  return (a.time || "99:99").localeCompare(b.time || "99:99");
}

/** Every occurrence between two days (inclusive). */
export async function occurrencesBetween(from: string, to: string, filter: Raw = {}) {
  const [tasks, pm] = await Promise.all([
    Task.find({ ...filter, date: { $ne: null, $lte: to }, $or: [{ repeat: "none", date: { $gte: from } }, { repeat: { $ne: "none" } }] }).lean(),
    projectMap(),
  ]);
  const out: Occurrence[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const t of tasks as Raw[]) if (occursOn(t, d)) out.push(toOcc(t, d, pm));
  }
  return out.sort(sortOcc);
}

/** One-off tasks from past days that were never finished. */
export async function overdue(today: string, filter: Raw = {}) {
  const [tasks, pm] = await Promise.all([Task.find({ ...filter, repeat: "none", date: { $ne: null, $lt: today } }).lean(), projectMap()]);
  return (tasks as Raw[]).filter((t) => !(t.doneDates || []).includes(t.date)).map((t) => toOcc(t, t.date, pm)).sort(sortOcc);
}

/** Undated tasks (backlog / "what to add next"). */
export async function backlog(filter: Raw = {}, includeDone = false) {
  const [tasks, pm] = await Promise.all([Task.find({ ...filter, date: null }).sort({ createdAt: -1 }).lean(), projectMap()]);
  return (tasks as Raw[]).map((t) => toOcc(t, null, pm)).filter((o) => includeDone || !o.done);
}

/** Progress per project, from its one-off + backlog tasks (repeating tasks are habits, not progress). */
export async function projectStats() {
  const tasks = (await Task.find({ projectId: { $ne: null }, repeat: "none" }, { projectId: 1, date: 1, doneDates: 1 }).lean()) as Raw[];
  const map = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const k = String(t.projectId);
    const s = map.get(k) || { total: 0, done: 0 };
    s.total++;
    if ((t.doneDates || []).includes(t.date ?? "backlog")) s.done++;
    map.set(k, s);
  }
  return map;
}

export function projectProgress(p: Raw, stats?: { total: number; done: number }) {
  if (typeof p.progress === "number") return p.progress;
  if (p.status === "done") return 100;
  if (stats && stats.total > 0) return Math.round((stats.done / stats.total) * 100);
  // No tasks yet: estimate from the phase.
  const n = p.phases?.length || 1;
  return Math.round(((p.phase || 0) / n) * 100);
}

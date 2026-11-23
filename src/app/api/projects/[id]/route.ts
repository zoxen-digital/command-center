import { route, pick, today, type Ctx } from "@/lib/api";
import { Project, Task, Note, Activity, plain } from "@/lib/db";
import { projectStats, projectProgress, occurrencesBetween, overdue, backlog } from "@/lib/tasks";
import { addDays } from "@/lib/dates";
import { PROJECT_FIELDS } from "@/lib/fields";

export const dynamic = "force-dynamic";

export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const p = await Project.findById(id).lean();
  if (!p) throw new Error("Project not found");
  const { date } = await today();
  const filter = { projectId: id };
  const [stats, upcoming, late, ideas, notes, activity] = await Promise.all([
    projectStats(),
    occurrencesBetween(date, addDays(date, 30), filter),
    overdue(date, filter),
    backlog(filter, true),
    Note.find(filter).sort({ pinned: -1, updatedAt: -1 }).lean(),
    Activity.find(filter).sort({ createdAt: -1 }).limit(15).lean(),
  ]);
  const st = stats.get(id) || { total: 0, done: 0 };
  return {
    project: { ...plain(p), id, tasksTotal: st.total, tasksDone: st.done, pct: projectProgress(p, st) },
    upcoming, overdue: late, backlog: ideas, notes: plain(notes), activity: plain(activity),
  };
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const before = await Project.findById(id);
  if (!before) throw new Error("Project not found");
  const p = await Project.findByIdAndUpdate(id, pick(body, PROJECT_FIELDS), { new: true });
  const { date } = await today();
  if ("phase" in body && body.phase !== before.phase) {
    await Activity.create({ day: date, projectId: id, text: `Phase → ${p.phases[p.phase] ?? body.phase}` });
  }
  if ("status" in body && body.status !== before.status) {
    await Activity.create({ day: date, projectId: id, text: `Status → ${body.status}` });
  }
  return plain(p);
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  await Promise.all([Project.findByIdAndDelete(id), Task.deleteMany({ projectId: id }), Note.updateMany({ projectId: id }, { projectId: null })]);
  return { ok: true };
});

import { route, pick } from "@/lib/api";
import { PROJECT_FIELDS } from "@/lib/fields";
import { Project, Activity, plain } from "@/lib/db";
import { projectStats, projectProgress } from "@/lib/tasks";
import { ymd } from "@/lib/dates";

export const dynamic = "force-dynamic";


export const GET = route(async () => {
  const [projects, stats] = await Promise.all([Project.find().sort({ order: 1, createdAt: 1 }).lean(), projectStats()]);
  return plain(projects).map((p: any) => {
    const st = stats.get(String(p._id)) || { total: 0, done: 0 };
    return { ...p, id: p._id, tasksTotal: st.total, tasksDone: st.done, pct: projectProgress(p, st) };
  });
});

export const POST = route(async (req) => {
  const body = await req.json();
  if (!body.name?.trim()) throw new Error("Project name is required");
  const count = await Project.countDocuments();
  const p = await Project.create({ ...pick(body, PROJECT_FIELDS), order: count });
  await Activity.create({ day: ymd(new Date()), text: `New project: ${p.name}`, projectId: p._id });
  return plain(p);
});

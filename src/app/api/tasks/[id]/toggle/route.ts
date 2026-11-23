import { route, today, type Ctx } from "@/lib/api";
import { Task, Activity } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST { occ: "YYYY-MM-DD" | null } — marks one occurrence done / not done.
export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { occ } = await req.json();
  const key = occ || "backlog";
  const t = await Task.findById(id);
  if (!t) throw new Error("Task not found");
  const done = !t.doneDates.includes(key);
  await Task.updateOne({ _id: id }, done ? { $addToSet: { doneDates: key } } : { $pull: { doneDates: key } });
  if (done) {
    const { date } = await today();
    await Activity.create({ day: date, projectId: t.projectId, text: `Done: ${t.title}` });
  }
  return { done };
});

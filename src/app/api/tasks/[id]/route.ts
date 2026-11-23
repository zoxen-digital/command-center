import { route, pick, type Ctx } from "@/lib/api";
import { Task, plain } from "@/lib/db";
import { TASK_FIELDS } from "@/lib/fields";

export const dynamic = "force-dynamic";

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = pick(body, TASK_FIELDS);
  // Rescheduling a one-off task: carry over "done" and allow a fresh reminder.
  const before = await Task.findById(id);
  if (!before) throw new Error("Task not found");
  if (("date" in update && update.date !== before.date) || ("time" in update && update.time !== before.time)) {
    update.notified = [];
    if (before.repeat === "none") {
      const wasDone = before.doneDates.includes(before.date ?? "backlog");
      update.doneDates = wasDone ? [(update.date ?? before.date) || "backlog"] : [];
    }
  }
  return plain(await Task.findByIdAndUpdate(id, update, { new: true }));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  await Task.findByIdAndDelete(id);
  return { ok: true };
});

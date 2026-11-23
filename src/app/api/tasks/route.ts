import { route, pick, today } from "@/lib/api";
import { TASK_FIELDS } from "@/lib/fields";
import { Task, plain } from "@/lib/db";
import { occurrencesBetween, overdue, backlog } from "@/lib/tasks";

export const dynamic = "force-dynamic";


// GET /api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD | ?view=overdue | ?view=backlog   (+ &projectId=)
export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams;
  const filter = q.get("projectId") ? { projectId: q.get("projectId") } : {};
  const { date } = await today();
  if (q.get("view") === "overdue") return overdue(date, filter);
  if (q.get("view") === "backlog") return backlog(filter, q.get("done") === "1");
  return occurrencesBetween(q.get("from") || date, q.get("to") || q.get("from") || date, filter);
});

export const POST = route(async (req) => {
  const body = await req.json();
  if (!body.title?.trim()) throw new Error("Task title is required");
  const t = await Task.create(pick(body, TASK_FIELDS));
  return plain(t);
});

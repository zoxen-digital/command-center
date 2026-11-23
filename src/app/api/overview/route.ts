import { route, today } from "@/lib/api";
import { Project, Activity, Task, getSettings, plain } from "@/lib/db";
import { occurrencesBetween, overdue, projectStats, projectProgress } from "@/lib/tasks";
import { addDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Everything the home dashboard needs in one request.
export const GET = route(async () => {
  const { date, minutes } = await today();
  const s = await getSettings();
  const [todays, week, late, projects, stats, activity, recentDone] = await Promise.all([
    occurrencesBetween(date, date),
    occurrencesBetween(addDays(date, 1), addDays(date, 7)),
    overdue(date),
    Project.find().sort({ order: 1 }).lean(),
    projectStats(),
    Activity.find().sort({ createdAt: -1 }).limit(12).lean(),
    Task.find({ doneDates: { $exists: true, $ne: [] } }, { doneDates: 1 }).lean(),
  ]);

  // Streak: consecutive days (ending today or yesterday) with at least one completed task.
  const doneDays = new Set<string>();
  for (const t of recentDone as any[]) for (const d of t.doneDates) if (d !== "backlog") doneDays.add(d);
  const acts = await Activity.find({ text: /^Done:/ }, { day: 1 }).lean();
  for (const a of acts as any[]) doneDays.add(a.day);
  let streak = 0;
  let d = doneDays.has(date) ? date : addDays(date, -1);
  while (doneDays.has(d)) {
    streak++;
    d = addDays(d, -1);
  }

  // Last 14 days of completions for the activity chart.
  const history = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(date, i - 13);
    const count = (recentDone as any[]).reduce((n, t) => n + (t.doneDates.includes(day) ? 1 : 0), 0);
    return { day, count };
  });

  return {
    date, minutes, ownerName: s.ownerName,
    today: todays, week, overdue: late, streak, history,
    activity: plain(activity),
    projects: plain(projects).map((p: any) => {
      const st = stats.get(String(p._id)) || { total: 0, done: 0 };
      return { ...p, id: p._id, tasksTotal: st.total, tasksDone: st.done, pct: projectProgress(p, st) };
    }),
  };
});

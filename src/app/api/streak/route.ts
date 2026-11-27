import { route, today } from "@/lib/api";
import { StreakDay } from "@/lib/db";
import { computeStreak, type StreakLog } from "@/lib/streak";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const { date } = await today();
  const logs = (await StreakDay.find({}, { _id: 0, day: 1, status: 1 }).sort({ day: 1 }).lean()) as unknown as StreakLog[];
  return { today: date, logs, ...computeStreak(logs, date) };
});

// POST { day: "YYYY-MM-DD", status: "clean" | "relapse" | null }   (null clears that day)
export const POST = route(async (req) => {
  const { day, status } = await req.json();
  const { date } = await today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) throw new Error("Invalid day");
  if (day > date) throw new Error("Future days can't be marked");
  if (status === null) await StreakDay.deleteOne({ day });
  else if (status === "clean" || status === "relapse") await StreakDay.updateOne({ day }, { day, status }, { upsert: true });
  else throw new Error("Invalid status");
  return { ok: true };
});

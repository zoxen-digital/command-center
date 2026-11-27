import { addDays } from "./dates";

export type DayStatus = "clean" | "relapse";
export type StreakLog = { day: string; status: DayStatus };

export const MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365];

/**
 * Current streak = clean days in a row, ending today (or yesterday if today has no check-in yet).
 * A relapse, or a day with no check-in, ends the run.
 */
export function computeStreak(logs: StreakLog[], today: string) {
  const map = new Map(logs.map((l) => [l.day, l.status]));
  let start = map.get(today) === "clean" ? today : addDays(today, -1);
  let current = 0;
  while (map.get(start) === "clean") {
    current++;
    start = addDays(start, -1);
  }
  // Best run ever, over every logged day.
  const days = [...map.keys()].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of days) {
    if (map.get(d) === "clean") {
      run = prev && addDays(prev, 1) === d && map.get(prev) === "clean" ? run + 1 : 1;
      best = Math.max(best, run);
    } else run = 0;
    prev = d;
  }
  const relapses = logs.filter((l) => l.status === "relapse").length;
  const clean = logs.filter((l) => l.status === "clean").length;
  const next = MILESTONES.find((m) => m > current) ?? current + 30;
  return { current, best, relapses, clean, next, todayStatus: map.get(today) ?? null };
}

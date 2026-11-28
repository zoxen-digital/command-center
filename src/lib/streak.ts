import { addDays } from "./dates";

export const MILESTONES = [1, 3, 7, 14, 21, 30, 60, 90, 180, 365];

export type Tracker = { id: string; name: string; kind: "check" | "amount"; target: number; unit: string; step: number; color: string };
export type DayEntry = { day: string; status?: "done" | "missed" | null; amount?: number | null };

/** A day counts when it was checked off, or (amount trackers) when the goal was reached. */
export function isDone(t: Pick<Tracker, "kind" | "target">, e?: DayEntry) {
  if (!e) return false;
  return t.kind === "amount" ? (e.amount ?? 0) >= t.target : e.status === "done";
}

/** Current streak = done days in a row ending today, or yesterday while today is still open. */
export function computeStreak(t: Pick<Tracker, "kind" | "target">, entries: DayEntry[], today: string) {
  const map = new Map(entries.map((e) => [e.day, e]));
  let d = isDone(t, map.get(today)) ? today : addDays(today, -1);
  let current = 0;
  while (isDone(t, map.get(d))) {
    current++;
    d = addDays(d, -1);
  }
  let best = 0;
  let run = 0;
  let prev = "";
  for (const day of [...map.keys()].sort()) {
    if (isDone(t, map.get(day))) {
      run = prev && addDays(prev, 1) === day && isDone(t, map.get(prev)) ? run + 1 : 1;
      best = Math.max(best, run);
    } else run = 0;
    prev = day;
  }
  const doneDays = entries.filter((e) => isDone(t, e)).length;
  const resets = entries.filter((e) => e.day < today && !isDone(t, e) && (t.kind === "check" ? e.status === "missed" : true)).length;
  return { current, best, doneDays, resets, next: MILESTONES.find((m) => m > current) ?? current + 30, todayEntry: map.get(today) ?? null };
}

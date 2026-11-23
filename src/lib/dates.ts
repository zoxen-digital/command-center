// Shared (client + server) date helpers. Dates are "YYYY-MM-DD" strings, times "HH:mm".

export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function weekStart(s: string) {
  const d = parseYmd(s);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return ymd(d);
}
export function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
export function fmtTime(t?: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return parseYmd(s).toLocaleDateString("en-GB", opts);
}

/** Today's date and minute-of-day in a given IANA timezone (the server may run in UTC). */
export function nowIn(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

type Occurs = { date?: string | null; repeat?: string | null; until?: string | null };

/** Does a task (possibly repeating) fall on the given day? */
export function occursOn(t: Occurs, day: string) {
  if (!t.date || day < t.date) return false;
  if (t.until && day > t.until) return false;
  const r = t.repeat || "none";
  if (r === "none") return day === t.date;
  if (r === "daily") return true;
  const d = parseYmd(day);
  if (r === "weekdays") return d.getDay() !== 0 && d.getDay() !== 6;
  if (r === "weekly") return d.getDay() === parseYmd(t.date).getDay();
  if (r === "monthly") return d.getDate() === parseYmd(t.date).getDate();
  return false;
}

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: "Once", daily: "Every day", weekdays: "Mon–Fri", weekly: "Every week", monthly: "Every month",
};

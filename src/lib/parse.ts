import { addDays, ymd, parseYmd } from "./dates";

/**
 * Quick-add parser. Examples:
 *   "Call Ali tomorrow 5pm #sales !high"
 *   "Gym every day 7am"       "Client meeting fri 14:30 30m before"
 *   "Write blog post"          (no date → backlog)
 */
export type Parsed = { title: string; date: string | null; time: string | null; priority?: string; repeat?: string; projectQuery?: string; remindBefore?: number };

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function parseQuick(input: string, today: string): Parsed {
  let s = ` ${input} `;
  const out: Parsed = { title: "", date: null, time: null };
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = s.match(re);
    if (m) {
      fn(m);
      s = s.replace(m[0], " ");
    }
  };

  take(/\s!(high|h|medium|med|m|low|l)\b/i, (m) => {
    const v = m[1].toLowerCase()[0];
    out.priority = v === "h" ? "high" : v === "l" ? "low" : "medium";
  });
  take(/\s#([\w-]+)/, (m) => (out.projectQuery = m[1].replace(/-/g, " ")));
  take(/\s(every ?day|daily|roz)\b/i, () => (out.repeat = "daily"));
  take(/\s(weekdays|mon-fri)\b/i, () => (out.repeat = "weekdays"));
  take(/\s(every ?week|weekly)\b/i, () => (out.repeat = "weekly"));
  take(/\s(every ?month|monthly)\b/i, () => (out.repeat = "monthly"));
  take(/\s(\d{1,3})\s?m(in)?\s?before\b/i, (m) => (out.remindBefore = Number(m[1])));

  // time: 5pm, 5:30pm, 17:00, at 9
  take(/\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/i, (m) => {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === "pm") h += 12;
    out.time = `${String(h).padStart(2, "0")}:${m[2] || "00"}`;
  });
  if (!out.time) take(/\s(?:at\s)?([01]?\d|2[0-3]):([0-5]\d)\b/, (m) => (out.time = `${m[1].padStart(2, "0")}:${m[2]}`));

  // date
  take(/\s(today|aaj)\b/i, () => (out.date = today));
  take(/\s(tomorrow|tmrw|kal)\b/i, () => (out.date = addDays(today, 1)));
  take(/\snext week\b/i, () => (out.date = addDays(today, 7)));
  take(/\sin (\d+) days?\b/i, (m) => (out.date = addDays(today, Number(m[1]))));
  take(/\s(?:on\s)?(sun|mon|tue|wed|thu|fri|sat)(?:day|s|sday|nesday|rs|rsday|urday)?\b/i, (m) => {
    const target = DAYS.indexOf(m[1].toLowerCase());
    const cur = parseYmd(today).getDay();
    out.date = addDays(today, ((target - cur + 7) % 7) || 7);
  });
  take(/\s(\d{4}-\d{2}-\d{2})\b/, (m) => (out.date = m[1]));
  take(/\s(\d{1,2})\/(\d{1,2})\b/, (m) => {
    const y = parseYmd(today).getFullYear();
    out.date = ymd(new Date(y, Number(m[2]) - 1, Number(m[1])));
  });

  if ((out.time || out.repeat) && !out.date) out.date = today;
  out.title = s.replace(/\s+/g, " ").trim();
  return out;
}

import { route, today } from "@/lib/api";
import { StreakDay, Tracker, TrackerDay, plain } from "@/lib/db";
import { computeStreak, type DayEntry } from "@/lib/streak";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** First visit: create the two starter streaks, and move check-ins saved by the first streak page. */
async function ensureTrackers() {
  if (await Tracker.exists({})) return;
  const [clean] = await Tracker.create([
    { name: "Stay clean", kind: "check", color: "#10b981", order: 0 },
    { name: "Water", kind: "amount", target: 4, unit: "L", step: 0.5, color: "#0ea5e9", order: 1 },
  ]);
  const old = await StreakDay.find().lean();
  if (old.length)
    await TrackerDay.insertMany(old.map((o: any) => ({ trackerId: clean._id, day: o.day, status: o.status === "clean" ? "done" : "missed" })), { ordered: false }).catch(() => {});
}

export const GET = route(async () => {
  await ensureTrackers();
  const { date } = await today();
  const [trackers, days] = await Promise.all([Tracker.find().sort({ order: 1, createdAt: 1 }).lean(), TrackerDay.find({}, { _id: 0, trackerId: 1, day: 1, status: 1, amount: 1 }).lean()]);
  const byTracker: Record<string, DayEntry[]> = {};
  for (const d of days as any[]) (byTracker[String(d.trackerId)] ||= []).push({ day: d.day, status: d.status, amount: d.amount });
  return {
    today: date,
    trackers: plain(trackers).map((t: any) => {
      const id = String(t._id);
      return { ...t, id, entries: byTracker[id] || [], ...computeStreak(t, byTracker[id] || [], date) };
    }),
  };
});

const FIELDS = ["name", "kind", "target", "unit", "step", "color"];
const clean = (b: any) => {
  const out: any = {};
  for (const k of FIELDS) if (k in b) out[k] = b[k];
  if ("name" in out && !String(out.name).trim()) throw new Error("Name is required");
  for (const k of ["target", "step"]) if (k in out && !(Number(out[k]) > 0)) throw new Error(`${k} must be more than 0`);
  return out;
};

// POST { action: "day" | "create" | "update" | "delete", ... }
export const POST = route(async (req) => {
  const b = await req.json();
  const { date } = await today();
  if (b.action === "create") return plain(await Tracker.create({ ...clean(b), order: await Tracker.countDocuments() }));
  const t = await Tracker.findById(b.trackerId);
  if (!t) throw new Error("Streak not found");
  if (b.action === "update") return plain(await Tracker.findByIdAndUpdate(t._id, clean(b), { new: true }));
  if (b.action === "delete") {
    await Promise.all([Tracker.deleteOne({ _id: t._id }), TrackerDay.deleteMany({ trackerId: t._id })]);
    return { ok: true };
  }
  if (b.action !== "day") throw new Error("Unknown action");
  if (!YMD.test(b.day || "") || b.day > date) throw new Error("Pick today or an earlier day");
  const key = { trackerId: t._id, day: b.day };
  if (b.clear) await TrackerDay.deleteOne(key);
  else if (t.kind === "check") {
    if (b.status !== "done" && b.status !== "missed") throw new Error("Invalid status");
    await TrackerDay.updateOne(key, { $set: { status: b.status } }, { upsert: true });
  } else {
    const cur = ((await TrackerDay.findOne(key).lean()) as any)?.amount || 0;
    const amount = Math.round(Math.max(0, "add" in b ? cur + Number(b.add) : Number(b.amount)) * 100) / 100;
    if (!Number.isFinite(amount)) throw new Error("Invalid amount");
    await TrackerDay.updateOne(key, { $set: { amount } }, { upsert: true });
  }
  return { ok: true };
});

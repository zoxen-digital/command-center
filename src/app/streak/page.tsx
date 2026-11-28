"use client";
import { useState } from "react";
import { useApi, api } from "@/lib/client";
import { fmtDate, parseYmd, ymd } from "@/lib/dates";
import { MILESTONES, isDone, type DayEntry, type Tracker } from "@/lib/streak";
import { Modal, SetupError } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { Check, ChevronLeft, ChevronRight, Flame, Minus, Pencil, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";

type Row = Tracker & { entries: DayEntry[]; current: number; best: number; doneDays: number; resets: number; next: number; todayEntry: DayEntry | null };
type Data = { today: string; trackers: Row[] };

const fmtAmt = (n: number) => String(Math.round(n * 100) / 100);

export default function StreakPage() {
  const { data, error } = useApi<Data>("/api/streak");
  const [sel, setSel] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Tracker> | null>(null);
  const { toast } = useApp();

  if (error) return <SetupError error={error} />;
  if (!data) return <div className="card h-72 animate-pulse" />;
  const t = data.trackers.find((x) => x.id === sel) || data.trackers[0];

  async function day(body: Record<string, unknown>, msg?: string) {
    try {
      await api("/api/streak", "POST", { action: "day", trackerId: t!.id, ...body });
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-heading">Streaks</h1>
          <p className="text-sm text-muted">Check in every day. Miss a day and the count starts again.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEdit({ kind: "check", color: "#6c3bf5" })}><Plus size={16} /> New streak</button>
      </div>

      {/* All streaks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.trackers.map((x) => {
          const doneToday = isDone(x, x.todayEntry ?? undefined);
          return (
            <button key={x.id} onClick={() => setSel(x.id)}
              className={`card p-4 text-left transition ${x.id === t?.id ? "ring-2" : "hover:-translate-y-0.5"}`} style={x.id === t?.id ? { ["--tw-ring-color" as string]: x.color } : undefined}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold truncate">{x.name}</span>
                {doneToday && <Check size={16} strokeWidth={3} style={{ color: x.color }} />}
              </div>
              <div className="flex items-baseline gap-1 mt-2"><span className="font-display font-extrabold text-3xl" style={{ color: x.color }}>{x.current}</span><span className="text-xs text-muted">days</span></div>
              <div className="text-[11px] text-muted mt-0.5">{x.kind === "amount" ? `${fmtAmt(x.todayEntry?.amount ?? 0)} / ${fmtAmt(x.target)} ${x.unit} today` : doneToday ? "Done today" : "Not checked in today"}</div>
            </button>
          );
        })}
      </div>

      {t ? <Detail key={t.id} t={t} today={data.today} month={month} setMonth={setMonth} day={day} onEdit={() => setEdit(t)} /> : (
        <div className="card p-8 text-center text-muted">No streaks yet. Create one to start.</div>
      )}

      <TrackerModal value={edit} onClose={() => setEdit(null)} onSaved={(id) => id && setSel(id)} />
    </div>
  );
}

function Detail({ t, today, month, setMonth, day, onEdit }: { t: Row; today: string; month: string | null; setMonth: (m: string) => void; day: (b: Record<string, unknown>, msg?: string) => Promise<void>; onEdit: () => void }) {
  const map = new Map(t.entries.map((e) => [e.day, e]));
  const m = month || today.slice(0, 7);
  const first = parseYmd(`${m}-01`);
  const lead = (first.getDay() + 6) % 7;
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: lead + daysIn }, (_, i) => (i < lead ? null : `${m}-${String(i - lead + 1).padStart(2, "0")}`));
  const shift = (n: number) => setMonth(ymd(new Date(first.getFullYear(), first.getMonth() + n, 1)).slice(0, 7));
  const pct = Math.min(100, Math.round((t.current / t.next) * 100));
  const todayAmt = t.todayEntry?.amount ?? 0;
  const todayStatus = t.todayEntry?.status ?? null;

  function tapDay(d: string) {
    const e = map.get(d);
    if (t.kind === "check") {
      // empty -> done -> missed -> empty
      if (!e?.status) day({ day: d, status: "done" });
      else if (e.status === "done") day({ day: d, status: "missed" });
      else day({ day: d, clear: true });
      return;
    }
    const v = prompt(`${t.name} on ${fmtDate(d)} (${t.unit})`, fmtAmt(e?.amount ?? 0));
    if (v !== null && v.trim() !== "" && Number.isFinite(Number(v))) day({ day: d, amount: Number(v) });
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-[2rem] bg-navy text-white p-6 sm:p-8">
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 85% 15%, ${t.color}66, transparent 45%), radial-gradient(circle at 0% 100%, rgba(38,57,232,.5), transparent 50%)` }} />
        <div className="relative flex flex-wrap items-center gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: t.color }}><Flame size={18} /> {t.name}</div>
            <div className="font-display font-extrabold text-6xl sm:text-7xl leading-none mt-2">{t.current}<span className="text-2xl text-white/60 ml-2">days</span></div>
            <div className="mt-4 w-64 max-w-full">
              <div className="flex justify-between text-xs text-white/60 mb-1"><span>Next goal</span><span>{t.current}/{t.next} days</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.color }} /></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["Best", t.best], ["Done days", t.doneDays], ["Missed", t.resets]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-white/[.07] border border-white/10 px-4 py-3"><div className="text-2xl font-display font-bold">{v}</div><div className="text-[11px] text-white/60">{l}</div></div>
            ))}
          </div>
        </div>
        <button onClick={onEdit} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20" aria-label="Edit streak"><Pencil size={15} /></button>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-heading mb-4">Today, {fmtDate(today, { weekday: "long", day: "numeric", month: "short" })}</h2>
        {t.kind === "check" ? (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => day({ day: today, status: "done" }, "Nice! Keep it going 🔥")} disabled={todayStatus === "done"}
                className="btn !h-14 !text-base text-white disabled:opacity-60" style={{ background: t.color }}><Check size={20} strokeWidth={3} /> Done today</button>
              <button onClick={() => confirm("Reset this streak to 0?") && day({ day: today, status: "missed" }, "Reset. Start again today.")} disabled={todayStatus === "missed"}
                className="btn btn-danger !h-14 !text-base"><RotateCcw size={18} /> Missed (reset)</button>
            </div>
            {todayStatus && <button className="text-xs text-muted hover:text-fg mt-3" onClick={() => day({ day: today, clear: true })}>Undo today’s check-in</button>}
          </>
        ) : (
          <>
            <div className="flex items-end justify-between mb-2">
              <div className="font-display font-extrabold text-4xl text-heading">{fmtAmt(todayAmt)}<span className="text-lg text-muted"> / {fmtAmt(t.target)} {t.unit}</span></div>
              {todayAmt >= t.target && <span className="chip" style={{ color: t.color }}>Goal reached ✓</span>}
            </div>
            <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-4"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (todayAmt / t.target) * 100)}%`, background: t.color }} /></div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-outline !w-12 !px-0" disabled={!todayAmt} onClick={() => day({ day: today, add: -t.step })} aria-label={`Remove ${t.step} ${t.unit}`}><Minus size={16} /></button>
              {[t.step / 2, t.step, t.step * 2].map((s) => (
                <button key={s} className="btn flex-1 text-white" style={{ background: t.color }} onClick={() => day({ day: today, add: s }, todayAmt < t.target && todayAmt + s >= t.target ? "Goal reached! 🎉" : undefined)}>+{fmtAmt(s)} {t.unit}</button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <button className="btn btn-ghost !w-10 !px-0" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <h2 className="font-bold text-heading">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2>
          <button className="btn btn-ghost !w-10 !px-0" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} className="text-[11px] font-bold text-muted pb-1">{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const e = map.get(d);
            const done = isDone(t, e);
            const missed = !done && (t.kind === "check" ? e?.status === "missed" : !!e && d < today);
            const partial = t.kind === "amount" && !done && (e?.amount ?? 0) > 0;
            const future = d > today;
            return (
              <button key={d} disabled={future} onClick={() => tapDay(d)}
                className={`aspect-square rounded-xl text-sm font-semibold flex flex-col items-center justify-center transition ${done ? "text-white" : missed ? "bg-red-500 text-white" : future ? "text-muted/40" : "bg-surface-2 hover:ring-2 ring-line"} ${d === today ? "ring-2 ring-[#2639e8] ring-offset-2 ring-offset-surface" : ""}`}
                style={done ? { background: t.color } : partial && d === today ? { background: `${t.color}33` } : undefined}>
                {Number(d.slice(8))}
                {t.kind === "amount" && e?.amount ? <span className="text-[9px] font-normal opacity-80 leading-none">{fmtAmt(e.amount)}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded" style={{ background: t.color }} /> Done</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-red-500" /> Missed</span>
          <span>Forgot a day? Tap the date to fix it.</span>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-heading mb-3 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Goals</h2>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {MILESTONES.map((n) => (
            <div key={n} className={`rounded-2xl p-2 text-center ${t.current >= n ? "text-white" : t.best >= n ? "bg-surface-2 text-fg" : "bg-surface-2 text-muted"}`} style={t.current >= n ? { background: t.color } : undefined}>
              <div className="font-display font-bold">{n}</div><div className="text-[10px]">days</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

const COLORS = ["#10b981", "#0ea5e9", "#6c3bf5", "#f59e0b", "#e5484d", "#ec4899", "#2639e8"];

function TrackerModal({ value, onClose, onSaved }: { value: Partial<Tracker> | null; onClose: () => void; onSaved: (id?: string) => void }) {
  const [f, setF] = useState<Partial<Tracker>>({});
  const [last, setLast] = useState<Partial<Tracker> | null>(null);
  const { toast } = useApp();
  if (value !== last) {
    setLast(value);
    if (value) setF({ name: "", kind: "check", target: 4, unit: "L", step: 0.5, color: COLORS[2], ...value });
  }
  const set = (k: keyof Tracker, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = { ...f, target: Number(f.target), step: Number(f.step), trackerId: f.id, action: f.id ? "update" : "create" };
      const r = await api("/api/streak", "POST", body);
      toast(f.id ? "Streak saved" : "Streak created");
      onSaved(r._id);
      onClose();
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }
  async function remove() {
    if (!confirm(`Delete "${f.name}" and all its history?`)) return;
    await api("/api/streak", "POST", { action: "delete", trackerId: f.id });
    toast("Streak deleted");
    onClose();
  }

  return (
    <Modal open={!!value} onClose={onClose} title={f.id ? "Edit streak" : "New streak"}>
      <form onSubmit={save} className="space-y-4">
        <div><label className="label" htmlFor="sn">Name</label><input id="sn" autoFocus className="input" placeholder="e.g. Gym, Reading, Water" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
        {!f.id && (
          <div className="grid grid-cols-2 gap-2">
            {(["check", "amount"] as const).map((k) => (
              <button type="button" key={k} onClick={() => set("kind", k)} className={`rounded-2xl p-3 text-left border ${f.kind === k ? "border-[#2639e8] bg-[#2639e8]/5" : "border-line"}`}>
                <div className="text-sm font-semibold">{k === "check" ? "Yes / No" : "Daily amount"}</div>
                <div className="text-xs text-muted">{k === "check" ? "Done or missed each day" : "Reach a target, like 4 L water"}</div>
              </button>
            ))}
          </div>
        )}
        {f.kind === "amount" && (
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label" htmlFor="st">Daily target</label><input id="st" type="number" step="any" min="0" className="input" value={f.target ?? ""} onChange={(e) => set("target", e.target.value)} /></div>
            <div><label className="label" htmlFor="su">Unit</label><input id="su" className="input" value={f.unit || ""} onChange={(e) => set("unit", e.target.value)} /></div>
            <div><label className="label" htmlFor="ss">Button step</label><input id="ss" type="number" step="any" min="0" className="input" value={f.step ?? ""} onChange={(e) => set("step", e.target.value)} /></div>
          </div>
        )}
        <div>
          <span className="label">Color</span>
          <div className="flex gap-2">{COLORS.map((c) => <button type="button" key={c} aria-label={`Color ${c}`} onClick={() => set("color", c)} className={`size-8 rounded-full ${f.color === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`} style={{ background: c, ["--tw-ring-color" as string]: c }} />)}</div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {f.id && <button type="button" className="btn btn-danger !px-3" onClick={remove} aria-label="Delete streak"><Trash2 size={16} /></button>}
          <div className="flex-1" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!f.name?.trim()}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

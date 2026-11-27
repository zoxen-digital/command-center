"use client";
import { useEffect, useState } from "react";
import { useApi, api } from "@/lib/client";
import { addDays, fmtDate, parseYmd, ymd } from "@/lib/dates";
import { MILESTONES, type StreakLog } from "@/lib/streak";
import { SetupError } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { Check, ChevronLeft, ChevronRight, Flame, RotateCcw, Trophy, LifeBuoy, X } from "lucide-react";

type Data = { today: string; logs: StreakLog[]; current: number; best: number; relapses: number; clean: number; next: number; todayStatus: "clean" | "relapse" | null };

const TIPS = [
  "Phone neeche rakho aur kamre se bahar niklo.",
  "Thanda paani pee lo ya muh dho lo.",
  "10 push-ups ya 2 minute tez walk karo.",
  "4 second saans andar, 4 roko, 6 mein bahar. 5 baar.",
  "Kisi dost ko message ya call karo.",
  "Urge ek lehar jaisi hoti hai. 10-15 minute mein khud kam ho jaati hai.",
];

export default function StreakPage() {
  const { data, error } = useApi<Data>("/api/streak");
  const [month, setMonth] = useState<string | null>(null);
  const [sos, setSos] = useState(false);
  const { toast } = useApp();

  if (error) return <SetupError error={error} />;
  if (!data) return <div className="card h-72 animate-pulse" />;

  const status = new Map(data.logs.map((l) => [l.day, l.status]));
  const m = month || data.today.slice(0, 7);
  const first = parseYmd(`${m}-01`);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: lead + daysIn }, (_, i) => (i < lead ? null : `${m}-${String(i - lead + 1).padStart(2, "0")}`));
  const shift = (n: number) => setMonth(ymd(new Date(first.getFullYear(), first.getMonth() + n, 1)).slice(0, 7));
  const pct = Math.min(100, Math.round((data.current / data.next) * 100));

  async function mark(day: string, s: "clean" | "relapse" | null) {
    try {
      await api("/api/streak", "POST", { day, status: s });
      if (day === data!.today && s === "clean") toast(`Shabash! ${data!.current + (data!.todayStatus === "clean" ? 0 : 1)} din 🔥`);
      if (s === "relapse") toast("Koi baat nahi. Aaj se phir shuru. 💪");
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }
  // Calendar tap cycles: empty -> clean -> reset -> empty
  const cycle = (day: string) => mark(day, status.get(day) === undefined ? "clean" : status.get(day) === "clean" ? "relapse" : null);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-heading">Streak</h1>
        <p className="text-sm text-muted">Roz check-in karo. Jis din reset hua, ginti wahin se dobara shuru.</p>
      </div>

      {/* Big counter */}
      <section className="relative overflow-hidden rounded-[2rem] bg-navy text-white p-6 sm:p-8">
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 85% 15%, rgba(245,158,11,.35), transparent 45%), radial-gradient(circle at 0% 100%, rgba(38,57,232,.5), transparent 50%)" }} />
        <div className="relative flex flex-wrap items-center gap-6 justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm"><Flame size={18} /> Current streak</div>
            <div className="font-display font-extrabold text-6xl sm:text-7xl leading-none mt-2">{data.current}<span className="text-2xl text-white/60 ml-2">din</span></div>
            <div className="mt-4 w-64 max-w-full">
              <div className="flex justify-between text-xs text-white/60 mb-1"><span>Next goal</span><span>{data.current}/{data.next} din</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["Best", data.best], ["Clean days", data.clean], ["Resets", data.relapses]].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-white/[.07] border border-white/10 px-4 py-3"><div className="text-2xl font-display font-bold">{v}</div><div className="text-[11px] text-white/60">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* Today check-in */}
      <section className="card p-5">
        <h2 className="font-bold text-heading mb-1">Aaj ({fmtDate(data.today, { weekday: "long", day: "numeric", month: "short" })})</h2>
        <p className="text-sm text-muted mb-4">
          {data.todayStatus === "clean" ? "Aaj ka check-in ho gaya. ✅" : data.todayStatus === "relapse" ? "Aaj reset hua. Kal se nayi shuruaat." : "Aaj ka check-in baaki hai."}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => mark(data.today, "clean")} disabled={data.todayStatus === "clean"}
            className="btn !h-14 !text-base bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"><Check size={20} strokeWidth={3} /> Aaj nahi hua (clean)</button>
          <button onClick={() => confirm("Reset karein? Streak 0 se shuru hogi.") && mark(data.today, "relapse")} disabled={data.todayStatus === "relapse"}
            className="btn btn-danger !h-14 !text-base"><RotateCcw size={18} /> Aaj ho gaya (reset)</button>
        </div>
        {data.todayStatus && <button className="text-xs text-muted hover:text-fg mt-3" onClick={() => mark(data.today, null)}>Aaj ka check-in hatao</button>}
        <button onClick={() => setSos(true)} className="btn btn-outline w-full mt-4"><LifeBuoy size={16} /> Urge aa rahi hai? Madad lo</button>
      </section>

      {/* Calendar */}
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
            const s = status.get(d);
            const future = d > data.today;
            return (
              <button key={d} disabled={future} onClick={() => cycle(d)} title={s === "clean" ? "Clean" : s === "relapse" ? "Reset" : "No check-in"}
                className={`aspect-square rounded-xl text-sm font-semibold flex items-center justify-center transition ${
                  s === "clean" ? "bg-emerald-500 text-white" : s === "relapse" ? "bg-red-500 text-white" : future ? "text-muted/40" : "bg-surface-2 hover:ring-2 ring-line"
                } ${d === data.today ? "ring-2 ring-[#2639e8] ring-offset-2 ring-offset-surface" : ""}`}>
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-500" /> Clean</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-red-500" /> Reset</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-surface-2 border border-line" /> Check-in nahi</span>
          <span>Bhool gaye? Purani date par tap karke theek karo.</span>
        </div>
      </section>

      {/* Milestones */}
      <section className="card p-5">
        <h2 className="font-bold text-heading mb-3 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Goals</h2>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {MILESTONES.map((n) => {
            const got = data.best >= n;
            const now = data.current >= n;
            return (
              <div key={n} className={`rounded-2xl p-2 text-center ${now ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : got ? "bg-amber-500/15 text-amber-600" : "bg-surface-2 text-muted"}`}>
                <div className="font-display font-bold">{n}</div><div className="text-[10px]">din</div>
              </div>
            );
          })}
        </div>
      </section>

      {sos && <Sos onClose={() => setSos(false)} />}
    </div>
  );
}

function Sos({ onClose }: { onClose: () => void }) {
  const [left, setLeft] = useState(10 * 60);
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    const r = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 12000);
    return () => { clearInterval(t); clearInterval(r); };
  }, []);
  return (
    <div className="fixed inset-0 z-[70] bg-navy text-white flex flex-col items-center justify-center p-6 text-center">
      <button onClick={onClose} className="absolute top-5 right-5 p-2" aria-label="Close"><X size={22} /></button>
      <div className="text-white/60 text-sm">Bas 10 minute ruko</div>
      <div className="font-display font-extrabold text-7xl tabular-nums my-4">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</div>
      <p className="text-lg max-w-sm min-h-16">{left ? TIPS[tip] : "Tum jeet gaye. 💪 Ab ek kaam ki cheez shuru karo."}</p>
      <button onClick={() => setTip((i) => (i + 1) % TIPS.length)} className="btn bg-white/10 border border-white/20 text-white mt-6">Agla idea</button>
    </div>
  );
}

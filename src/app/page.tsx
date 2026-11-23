"use client";
import Link from "next/link";
import { useApi } from "@/lib/client";
import { fmtDate, fmtTime, toMinutes, addDays } from "@/lib/dates";
import type { Occurrence } from "@/lib/tasks";
import TaskItem from "@/components/TaskItem";
import ProjectCard from "@/components/ProjectCard";
import { Empty, Ring, SetupError } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { AlertTriangle, Flame, FolderKanban, Plus, Sun, ArrowRight, CalendarDays, Activity } from "lucide-react";

type Overview = {
  date: string; minutes: number; ownerName: string; today: Occurrence[]; week: Occurrence[]; overdue: Occurrence[];
  streak: number; history: { day: string; count: number }[]; activity: any[]; projects: any[];
};

function greeting(min: number) {
  if (min < 12 * 60) return "Good morning";
  if (min < 17 * 60) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { data, loading, error } = useApi<Overview>("/api/overview");
  const { openTask } = useApp();

  if (error) return <SetupError error={error} />;
  if (loading || !data) return <Skeleton />;

  const done = data.today.filter((t) => t.done).length;
  const pct = data.today.length ? Math.round((done / data.today.length) * 100) : 0;
  const next = data.today.find((t) => !t.done && t.time && toMinutes(t.time) >= data.minutes - 5);
  const active = data.projects.filter((p) => p.status === "active");
  const maxH = Math.max(1, ...data.history.map((h) => h.count));
  const byDay = data.week.reduce<Record<string, Occurrence[]>>((a, t) => ((a[t.occ!] ||= []).push(t), a), {});

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-navy text-white p-6 sm:p-8 shadow-[0_30px_60px_-30px_rgba(38,57,232,.7)]">
        <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(circle at 85% 20%, rgba(108,59,245,.55), transparent 45%), radial-gradient(circle at 10% 110%, rgba(38,57,232,.6), transparent 50%)" }} />
        <svg className="absolute -right-20 -top-24 w-[520px] opacity-30 pointer-events-none" viewBox="0 0 400 400" fill="none">
          <ellipse cx="200" cy="200" rx="190" ry="70" transform="rotate(-18 200 200)" stroke="url(#hg)" strokeWidth="1.5" />
          <ellipse cx="200" cy="200" rx="150" ry="52" transform="rotate(-18 200 200)" stroke="url(#hg)" strokeWidth="1" />
          <circle cx="330" cy="120" r="5" fill="#fff" />
          <defs><linearGradient id="hg" x1="0" x2="1"><stop stopColor="#fff" /><stop offset="1" stopColor="#6c3bf5" /></linearGradient></defs>
        </svg>
        <div className="relative flex flex-wrap items-center gap-6 justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold bg-white/10 border border-white/15 rounded-full px-3 py-1 backdrop-blur">
              <CalendarDays size={13} /> {fmtDate(data.date, { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold mt-3 !text-white">{greeting(data.minutes)}, {data.ownerName} 👋</h1>
            <p className="text-white/70 mt-2 text-sm sm:text-base">
              {next ? <>Next up: <b className="text-white">{next.title}</b> at {fmtTime(next.time)}</> : data.today.length ? (done === data.today.length ? "Everything for today is done. Great work! 🎉" : "No more timed tasks today. Finish the rest at your own pace.") : "Nothing planned for today yet. Let’s plan your day."}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              <button className="btn bg-white text-navy hover:bg-white/90" onClick={() => openTask()}><Plus size={16} /> New task</button>
              <Link href="/today" className="btn bg-white/10 border border-white/20 text-white hover:bg-white/20"><Sun size={16} /> Today</Link>
              <Link href="/planner" className="btn bg-white/10 border border-white/20 text-white hover:bg-white/20"><CalendarDays size={16} /> Plan week</Link>
            </div>
          </div>
          <div className="flex items-center gap-5 bg-white/[.07] border border-white/10 rounded-3xl p-5 backdrop-blur">
            <div className="relative">
              <svg width="112" height="112" className="-rotate-90">
                <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
                <circle cx="56" cy="56" r="48" fill="none" stroke="url(#hr)" strokeWidth="10" strokeLinecap="round" strokeDasharray={301.6} strokeDashoffset={301.6 - (301.6 * pct) / 100} style={{ transition: "stroke-dashoffset .6s" }} />
                <defs><linearGradient id="hr" x1="0" x2="1"><stop stopColor="#8ea0ff" /><stop offset="1" stopColor="#c4a8ff" /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-display font-extrabold">{pct}%</span><span className="text-[10px] text-white/60 uppercase tracking-wider">today</span></div>
            </div>
            <div className="space-y-2 text-sm">
              <div><div className="text-2xl font-display font-bold">{done}<span className="text-white/50 text-base">/{data.today.length}</span></div><div className="text-white/60 text-xs">tasks done</div></div>
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold"><Flame size={15} /> {data.streak} day streak</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={<Sun size={20} />} color="#2639e8" label="Left today" value={data.today.length - done} sub={`${data.today.length} planned`} href="/today" />
        <Stat icon={<AlertTriangle size={20} />} color="#e5484d" label="Overdue" value={data.overdue.length} sub={data.overdue.length ? "need attention" : "all clear ✓"} href="/tasks?view=overdue" />
        <Stat icon={<FolderKanban size={20} />} color="#6c3bf5" label="Active projects" value={active.length} sub={`${data.projects.length} total`} href="/projects" />
        <Stat icon={<CalendarDays size={20} />} color="#10b981" label="This week" value={data.week.length} sub="tasks in next 7 days" href="/planner" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today */}
        <div className="lg:col-span-2 space-y-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-heading flex items-center gap-2.5"><span className="size-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center"><Sun size={16} /></span> Today’s plan</h2>
              <Link href="/today" className="text-xs font-semibold text-muted hover:text-fg flex items-center gap-1">Open <ArrowRight size={12} /></Link>
            </div>
            {data.today.length === 0 ? (
              <Empty text="Nothing scheduled today. Add tasks or pull something from the backlog." action={<button className="btn btn-primary btn-sm" onClick={() => openTask()}><Plus size={14} /> Add task</button>} />
            ) : (
              <div className="relative">
                <span className="absolute left-[4.6rem] top-3 bottom-3 w-px bg-line" />
                {data.today.map((t) => {
                  const isNext = next?.id === t.id;
                  return (
                    <div key={t.id + t.occ} className="flex items-start gap-3">
                      <div className={`w-16 shrink-0 text-right pt-3 text-xs font-semibold ${isNext ? "text-gradient" : "text-muted"}`}>{t.time ? fmtTime(t.time) : "Any time"}</div>
                      <span className={`relative z-[1] mt-3.5 size-3 rounded-full shrink-0 ring-4 ring-surface ${t.done ? "bg-emerald-500" : isNext ? "bg-brand-gradient animate-pulse" : "bg-line"}`} style={!t.done && !isNext && t.project ? { background: t.project.color } : undefined} />
                      <div className={`flex-1 min-w-0 rounded-2xl ${isNext ? "bg-[#2639e8]/[.06] ring-1 ring-[#2639e8]/20" : ""}`}><TaskItem t={t} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {data.overdue.length > 0 && (
            <section className="card p-5 border-red-500/20">
              <h2 className="font-bold text-red-500 flex items-center gap-2 mb-3"><AlertTriangle size={18} /> Overdue ({data.overdue.length})</h2>
              {data.overdue.slice(0, 6).map((t) => <TaskItem key={t.id} t={t} showDate />)}
              {data.overdue.length > 6 && <Link href="/tasks?view=overdue" className="text-xs text-muted hover:text-fg px-3">+{data.overdue.length - 6} more</Link>}
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-heading">Projects</h2>
              <Link href="/projects" className="text-xs font-semibold text-muted hover:text-fg flex items-center gap-1">All projects <ArrowRight size={12} /></Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.projects.filter((p) => p.status !== "done").slice(0, 6).map((p) => <ProjectCard key={p.id} p={p} />)}
            </div>
          </section>
        </div>

        {/* Side */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold text-heading mb-3 flex items-center gap-2"><CalendarDays size={18} className="text-[#2639e8]" /> Next 7 days</h2>
            {Object.keys(byDay).length === 0 && <Empty text="Nothing planned this week." />}
            <div className="space-y-4">
              {Array.from({ length: 7 }, (_, i) => addDays(data.date, i + 1)).filter((d) => byDay[d]).map((d) => (
                <div key={d}>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted px-2 mb-1">{i18day(d, data.date)}</div>
                  {byDay[d].slice(0, 5).map((t) => <TaskItem key={t.id + t.occ} t={t} compact />)}
                  {byDay[d].length > 5 && <div className="text-xs text-muted px-2">+{byDay[d].length - 5} more</div>}
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-heading mb-4 flex items-center gap-2"><Activity size={18} className="text-[#6c3bf5]" /> Last 14 days</h2>
            <div className="flex items-end gap-1.5 h-28">
              {data.history.map((h) => (
                <div key={h.day} className="flex-1 flex flex-col items-center gap-1 group" title={`${fmtDate(h.day)}: ${h.count} done`}>
                  <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100">{h.count}</span>
                  <div className="w-full rounded-md bg-brand-gradient" style={{ height: `${(h.count / maxH) * 80 + 4}px`, opacity: h.count ? 1 : 0.15 }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted mt-2"><span>{fmtDate(data.history[0].day, { day: "numeric", month: "short" })}</span><span>Today</span></div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-heading mb-3">Recent activity</h2>
            {data.activity.length === 0 && <p className="text-sm text-muted">Finish a task to see it here.</p>}
            <ul className="space-y-2.5">
              {data.activity.map((a) => (
                <li key={a._id} className="text-sm flex gap-2">
                  <span className="size-1.5 rounded-full bg-[#6c3bf5] mt-2 shrink-0" />
                  <span className="flex-1">{a.text}</span>
                  <span className="text-[11px] text-muted whitespace-nowrap">{a.day === data.date ? "today" : fmtDate(a.day, { day: "numeric", month: "short" })}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function i18day(d: string, today: string) {
  return d === addDays(today, 1) ? "Tomorrow" : fmtDate(d, { weekday: "long", day: "numeric", month: "short" });
}

function Stat({ icon, color, label, value, sub, href }: { icon: React.ReactNode; color: string; label: string; value: React.ReactNode; sub: string; href?: string }) {
  const inner = (
    <div className="card p-5 h-full hover:-translate-y-1 hover:shadow-xl transition relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 size-24 rounded-full opacity-10 group-hover:opacity-20 transition" style={{ background: color }} />
      <div className="size-11 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg" style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 10px 20px -10px ${color}` }}>{icon}</div>
      <div className="text-3xl font-display font-extrabold text-heading leading-none">{value}</div>
      <div className="text-sm font-semibold mt-1.5">{label}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 w-80 rounded-2xl bg-surface-2" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 card" />)}</div>
      <div className="h-96 card" />
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Sun, CalendarDays, ListTodo, FolderKanban, StickyNote, Settings, Moon, Bell, Plus, Sparkles } from "lucide-react";
import { api, useApi, localToday } from "@/lib/client";
import { parseQuick } from "@/lib/parse";
import { fmtDate, fmtTime } from "@/lib/dates";
import { useApp } from "./Providers";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/notes", label: "Notes & Ideas", icon: StickyNote },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-9 rounded-xl" />
      <div className="leading-tight">
        <div className="font-display font-bold text-heading">Zoxen</div>
        <div className="text-[11px] text-muted -mt-0.5">Command Center</div>
      </div>
    </Link>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-sidebar border-r border-line p-4 gap-6">
        <Logo />
        <nav className="flex flex-col gap-1 no-scrollbar overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-muted px-3.5 mb-1">Menu</div>
          {NAV.map(({ href, label, icon: I }) => (
            <Link key={href} href={href}
              className={`group flex items-center gap-3 px-2 h-11 rounded-2xl text-sm font-semibold transition ${active(href) ? "bg-brand-gradient text-white shadow-[0_10px_24px_-10px_rgba(38,57,232,.9)]" : "text-muted hover:bg-surface-2 hover:text-fg"}`}>
              <span className={`size-8 rounded-xl flex items-center justify-center transition ${active(href) ? "bg-white/20" : "bg-surface-2 group-hover:bg-surface"}`}><I size={16} /></span> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto relative overflow-hidden rounded-3xl bg-navy text-white p-4 text-xs">
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 100% 0%, rgba(108,59,245,.6), transparent 60%)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 font-semibold mb-1.5"><Sparkles size={14} className="text-[#b9a4ff]" /> Quick add tip</div>
            <p className="text-white/70 leading-relaxed">Type <b className="text-white">“Call client kal 5pm #sales !high”</b> in the top bar.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="size-9 rounded-full bg-brand-gradient text-white font-bold flex items-center justify-center">Z</div>
          <div className="leading-tight"><div className="text-sm font-semibold text-heading">Zubair</div><div className="text-[11px] text-muted">Zoxen Digital</div></div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-16">
            <div className="lg:hidden"><Logo /></div>
            <QuickAdd />
            <BellMenu />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-4 lg:px-8 py-6 pb-28 lg:pb-10 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar border-t border-line flex justify-around py-2">
        {NAV.slice(0, 6).map(({ href, label, icon: I }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold px-2 ${active(href) ? "text-[#2639e8] dark:text-white" : "text-muted"}`}>
            <I size={20} /> {label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function QuickAdd() {
  const [v, setV] = useState("");
  const { openTask, toast } = useApp();
  const { data: projects } = useApi<any[]>("/api/projects");
  const p = v.trim() ? parseQuick(v, localToday()) : null;
  const proj = p?.projectQuery ? projects?.find((x) => x.name.toLowerCase().includes(p.projectQuery!.toLowerCase())) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p?.title) return;
    try {
      await api("/api/tasks", "POST", {
        title: p.title, date: p.date, time: p.time, priority: p.priority || "medium", repeat: p.repeat || "none",
        projectId: proj?.id || null, ...(p.remindBefore !== undefined ? { remindBefore: p.remindBefore } : {}),
      });
      toast(p.date ? `Added for ${p.date === localToday() ? "today" : fmtDate(p.date)}${p.time ? ` at ${fmtTime(p.time)}` : ""}` : "Added to backlog");
      setV("");
    } catch (err) {
      toast((err as Error).message, "err");
    }
  }

  return (
    <form onSubmit={submit} className="flex-1 relative max-w-2xl">
      <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Quick add: “Gym every day 7am” or “Send invoice fri 3pm #crm”"
        className="input !rounded-full !pl-11 !pr-24 !h-11" />
      <button type="button" onClick={() => openTask(p ? { title: p.title, date: p.date, time: p.time, projectId: proj?.id ?? null } : undefined)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-primary btn-sm">Details</button>
      {p?.title && (
        <div className="absolute left-0 right-0 top-full mt-2 card !rounded-2xl px-4 py-2.5 text-xs flex flex-wrap gap-2 items-center pop">
          <span className="font-semibold text-fg">{p.title}</span>
          <span className="chip">{p.date ? (p.date === localToday() ? "Today" : fmtDate(p.date)) : "Backlog"}</span>
          {p.time && <span className="chip">{fmtTime(p.time)}</span>}
          {p.repeat && <span className="chip">↻ {p.repeat}</span>}
          {p.priority && <span className="chip">!{p.priority}</span>}
          {p.projectQuery && <span className="chip" style={proj ? { color: proj.color } : undefined}>#{proj?.name || `${p.projectQuery} (not found)`}</span>}
          <span className="text-muted ml-auto">Enter ↵ to add</span>
        </div>
      )}
    </form>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.08;
    o.start(); o.frequency.setValueAtTime(660, ctx.currentTime + 0.15); o.stop(ctx.currentTime + 0.3);
  } catch {}
}

function BellMenu() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ items: any[]; unread: number }>({ items: [], unread: 0 });
  const { toast } = useApp();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const d = await fetch("/api/notifications", { cache: "no-store" }).then((r) => r.json());
        if (!alive || d.error) return;
        setData(d);
        const fresh = d.items.filter((n: any) => !n.shown);
        if (fresh.length) {
          beep();
          for (const n of fresh) {
            if ("Notification" in window && Notification.permission === "granted") new Notification(n.title, { body: n.body, icon: "/icon.svg", tag: n._id });
            toast(`${n.title} — ${n.body}`);
          }
          await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "shown", ids: fresh.map((n: any) => n._id) }) });
        }
      } catch {}
    }
    poll();
    const t = setInterval(poll, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, [toast]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function openMenu() {
    setOpen(!open);
    if (!open && data.unread) {
      await api("/api/notifications", "POST", { action: "readAll" });
      setData((d) => ({ ...d, unread: 0 }));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={openMenu} className="btn btn-outline !px-0 !w-11 !h-11 relative" aria-label="Notifications">
        <Bell size={18} />
        {data.unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 card !rounded-2xl p-2 pop max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="font-semibold text-sm text-heading">Notifications</span>
            {data.items.length > 0 && <button className="text-xs text-muted hover:text-fg" onClick={() => api("/api/notifications", "POST", { action: "clear" }).then(() => setData({ items: [], unread: 0 }))}>Clear all</button>}
          </div>
          {data.items.length === 0 && <p className="text-sm text-muted px-3 py-6 text-center">No notifications yet.</p>}
          {data.items.map((n) => (
            <div key={n._id} className="px-3 py-2.5 rounded-xl hover:bg-surface-2">
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted">{n.body}</div>
              <div className="text-[10px] text-muted mt-0.5">{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    localStorage.setItem("zx-theme", d ? "dark" : "light");
  }
  return (
    <button onClick={toggle} className="btn btn-outline !px-0 !w-11 !h-11" aria-label="Toggle theme">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

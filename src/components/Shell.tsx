"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Sun, CalendarDays, ListTodo, FolderKanban, StickyNote, Settings, Moon, Bell, Plus, Sparkles, Download, Menu, SlidersHorizontal } from "lucide-react";
import { useInstall, IosInstallHelp } from "./Install";
import { api, useApi, localToday, showNotice } from "@/lib/client";
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

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1 shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="size-9 rounded-xl" />
      <div className={`leading-tight ${compact ? "hidden sm:block" : ""}`}>
        <div className="font-display font-bold text-heading">Zoxen</div>
        <div className="text-[11px] text-muted -mt-0.5">Command Center</div>
      </div>
    </Link>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  return usePathname() === "/login" ? <>{children}</> : <Frame>{children}</Frame>;
}

function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  const [more, setMore] = useState(false);
  const { openTask } = useApp();
  const install = useInstall();
  useEffect(() => setMore(false), [path]);

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
        {install.canShow && (
          <button onClick={install.prompt} className="btn btn-outline w-full"><Download size={16} /> Install app</button>
        )}
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
        <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-line pt-[env(safe-area-inset-top)]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 sm:gap-3 px-4 lg:px-8 py-2.5 lg:py-0 lg:h-16">
            <div className="lg:hidden flex-1 sm:flex-none"><Logo compact /></div>
            <QuickAdd />
            {install.canShow && (
              <button onClick={install.prompt} className="lg:hidden btn btn-primary btn-sm !h-10" aria-label="Install app"><Download size={15} /><span className="hidden sm:inline">Install</span></button>
            )}
            <BellMenu />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 py-5 lg:py-6 pb-32 lg:pb-10 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 items-end h-16 max-w-md mx-auto">
          {MOBILE.slice(0, 2).map((n) => <MobileLink key={n.href} {...n} on={active(n.href)} />)}
          <div className="flex justify-center">
            <button onClick={() => openTask()} aria-label="New task"
              className="-mt-7 size-14 rounded-full bg-brand-gradient text-white flex items-center justify-center shadow-[0_12px_28px_-8px_rgba(38,57,232,.9)] ring-4 ring-bg active:scale-95 transition">
              <Plus size={26} />
            </button>
          </div>
          {MOBILE.slice(2, 3).map((n) => <MobileLink key={n.href} {...n} on={active(n.href)} />)}
          <button onClick={() => setMore(true)} className={`flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold ${more || ["/tasks", "/projects", "/notes", "/settings"].some((h) => active(h)) ? "text-[#2639e8] dark:text-white" : "text-muted"}`}>
            <Menu size={21} /> More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {more && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-0 bg-surface rounded-t-[2rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pop" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full bg-line mx-auto mb-5" />
            <div className="grid grid-cols-3 gap-3">
              {NAV.map(({ href, label, icon: I }) => (
                <Link key={href} href={href} className={`flex flex-col items-center gap-2 p-3 rounded-2xl text-xs font-semibold text-center ${active(href) ? "bg-brand-gradient text-white" : "bg-surface-2 text-fg"}`}>
                  <I size={22} /> {label}
                </Link>
              ))}
              {install.canShow && (
                <button onClick={install.prompt} className="flex flex-col items-center gap-2 p-3 rounded-2xl text-xs font-semibold bg-[#2639e8]/10 text-[#2639e8] dark:text-white">
                  <Download size={22} /> Install app
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {install.iosHelp && <IosInstallHelp onClose={install.closeIos} />}
    </div>
  );
}

const MOBILE = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/planner", label: "Planner", icon: CalendarDays },
];

function MobileLink({ href, label, icon: I, on }: { href: string; label: string; icon: typeof Sun; on: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold ${on ? "text-[#2639e8] dark:text-white" : "text-muted"}`}>
      <span className={`px-3.5 py-1 rounded-full transition ${on ? "bg-[#2639e8]/10 dark:bg-white/10" : ""}`}><I size={20} /></span>
      {label}
    </Link>
  );
}

function QuickAdd() {
  const [v, setV] = useState("");
  const { data: projects } = useApi<any[]>("/api/projects");
  const { openTask, toast } = useApp();
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
    <form onSubmit={submit} className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1 relative max-w-2xl">
      <Plus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Quick add: “Gym roz 7am”, “Invoice fri 3pm #crm”"
        className="input !rounded-full !pl-11 !pr-14 sm:!pr-24 !h-11" />
      <button type="button" onClick={() => openTask(p ? { title: p.title, date: p.date, time: p.time, projectId: proj?.id ?? null } : undefined)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-primary btn-sm !px-3" aria-label="Add with details"><span className="hidden sm:inline">Details</span><SlidersHorizontal size={14} className="sm:hidden" /></button>
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
            showNotice(n.title, n.body);
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
      <button onClick={openMenu} className="btn btn-outline !px-0 !w-10 !h-10 sm:!w-11 sm:!h-11 relative" aria-label="Notifications">
        <Bell size={18} />
        {data.unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{data.unread}</span>}
      </button>
      {open && (
        <div className="fixed sm:absolute left-3 right-3 top-16 sm:top-auto sm:left-auto sm:right-0 mt-2 sm:w-80 z-50 card !rounded-2xl p-2 pop max-h-[70vh] overflow-y-auto">
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
    <button onClick={toggle} className="btn btn-outline !px-0 !w-10 !h-10 sm:!w-11 sm:!h-11" aria-label="Toggle theme">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

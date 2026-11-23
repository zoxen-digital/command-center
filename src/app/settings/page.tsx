"use client";
import { useEffect, useState } from "react";
import { useApi, api, showNotice } from "@/lib/client";
import { SetupError } from "@/components/ui";
import { useApp } from "@/components/Providers";
import { Mail, BellRing, Sunrise, Moon, User, CheckCircle2, XCircle } from "lucide-react";

export default function SettingsPage() {
  const { data, error } = useApi<any>("/api/settings");
  const [f, setF] = useState<any>(null);
  const [perm, setPerm] = useState<string>("default");
  const [busy, setBusy] = useState(false);
  const { toast } = useApp();

  useEffect(() => { if (data && !f) setF(data); }, [data, f]);
  useEffect(() => { if ("Notification" in window) setPerm(Notification.permission); else setPerm("unsupported"); }, []);

  if (error) return <SetupError error={error} />;
  if (!f) return <div className="card h-64 animate-pulse" />;
  const set = (k: string, v: unknown) => setF((x: any) => ({ ...x, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await api("/api/settings", "PATCH", f);
      toast("Settings saved");
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }
  async function testMail() {
    try {
      await api("/api/settings", "PATCH", f);
      const r = await api("/api/test-mail", "POST");
      toast(`Test email sent to ${r.to}`);
    } catch (e) {
      toast((e as Error).message, "err");
    }
  }
  async function askPerm() {
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") showNotice("Notifications on ✅", "You will see task reminders here while the app is open.");
  }

  const Toggle = ({ k }: { k: string }) => (
    <button type="button" onClick={() => set(k, !f[k])} className={`w-11 h-6 rounded-full relative transition shrink-0 ${f[k] ? "bg-brand-gradient" : "bg-surface-2 border border-line"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${f[k] ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-extrabold text-heading">Settings</h1>

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-heading flex items-center gap-2"><User size={18} /> You</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Your name</label><input className="input" value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></div>
          <div><label className="label">Timezone</label>
            <input className="input" list="tz" value={f.timezone} onChange={(e) => set("timezone", e.target.value)} />
            <datalist id="tz">{["Asia/Karachi", "Asia/Kolkata", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "America/New_York", "UTC"].map((t) => <option key={t} value={t} />)}</datalist>
            <p className="text-xs text-muted mt-1">Reminders use this timezone. Your browser: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-bold text-heading flex items-center gap-2"><Mail size={18} /> Email notifications (Gmail App Password)</h2>
        <div className={`flex items-center gap-2 text-sm rounded-xl p-3 ${data.mailReady ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600"}`}>
          {data.mailReady ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {data.mailReady ? <>Gmail is connected as <b>{data.smtpUser}</b>.</> : <>Email is off. Add <code>SMTP_USER</code> and <code>SMTP_PASS</code> to <code>.env.local</code> and restart.</>}
        </div>
        <div><label className="label">Send reminders to</label><input className="input" type="email" placeholder={data.smtpUser || "you@gmail.com"} value={f.notifyEmail} onChange={(e) => set("notifyEmail", e.target.value)} /></div>
        <Row icon={<BellRing size={16} />} title="Task reminders by email" sub="An email at each task’s reminder time."><Toggle k="emailReminders" /></Row>
        <Row icon={<Sunrise size={16} />} title="Morning plan" sub="Today’s tasks and overdue items, every morning.">
          <input type="time" className="input !w-32" value={f.digestTime} onChange={(e) => set("digestTime", e.target.value)} disabled={!f.digestEnabled} /><Toggle k="digestEnabled" />
        </Row>
        <Row icon={<Moon size={16} />} title="Evening review" sub="What got done, what’s left and tomorrow’s plan.">
          <input type="time" className="input !w-32" value={f.eveningTime} onChange={(e) => set("eveningTime", e.target.value)} disabled={!f.eveningEnabled} /><Toggle k="eveningEnabled" />
        </Row>
        <button className="btn btn-outline" onClick={testMail} disabled={!data.mailReady}>Send test email</button>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="font-bold text-heading flex items-center gap-2"><BellRing size={18} /> Browser notifications</h2>
        <p className="text-sm text-muted">Pop-ups and a sound when a reminder is due, while the dashboard is open in a tab.</p>
        {perm === "granted" && <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2"><CheckCircle2 size={16} /> Enabled in this browser.</p>}
        {perm === "denied" && <p className="text-sm text-red-500">Blocked. Allow notifications for this site in your browser’s settings.</p>}
        {perm === "default" && <button className="btn btn-primary" onClick={askPerm}>Enable browser notifications</button>}
        {perm === "unsupported" && <p className="text-sm text-muted">This browser doesn’t support notifications.</p>}
      </section>

      <div className="flex justify-end sticky bottom-20 lg:bottom-4">
        <button className="btn btn-primary !h-11 !px-6" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
      </div>
    </div>
  );
}

function Row({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-2 border-t border-line first-of-type:border-0">
      <div className="size-9 rounded-xl bg-surface-2 flex items-center justify-center text-muted shrink-0">{icon}</div>
      <div className="flex-1 min-w-0"><div className="text-sm font-semibold">{title}</div><div className="text-xs text-muted">{sub}</div></div>
      <div className="flex items-center gap-3 ml-auto">{children}</div>
    </div>
  );
}

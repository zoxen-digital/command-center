"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const d = await res.json();
      if (res.ok) return window.location.replace("/");
      setErr(d.error || "Login failed");
    } catch {
      setErr("No internet connection");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card p-7 w-full max-w-sm space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="size-14 rounded-2xl" />
        <h1 className="text-2xl font-extrabold text-heading">Command</h1>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" autoFocus className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !password}>{busy ? "Opening…" : "Open"}</button>
      </form>
    </div>
  );
}

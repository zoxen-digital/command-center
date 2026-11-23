"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onMouseDown={onClose}>
      <div
        className={`card pop w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-3xl p-6`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-heading">{title}</h2>
          <button className="btn btn-ghost btn-sm !px-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon, text, action }: { icon?: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 text-muted gap-3">
      {icon && <div className="opacity-60">{icon}</div>}
      <p className="text-sm">{text}</p>
      {action}
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `rg${size}${color?.replace("#", "") || ""}`;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color || "#2639e8"} />
          <stop offset="100%" stopColor={color ? color : "#6c3bf5"} stopOpacity={color ? 0.7 : 1} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * Math.max(0, Math.min(100, value))) / 100}
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
    </svg>
  );
}

export const PRIORITY_COLOR: Record<string, string> = { high: "#e5484d", medium: "#f59e0b", low: "#10b981" };

export const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "#8c93b0" },
  active: { label: "Active", color: "#2639e8" },
  paused: { label: "On hold", color: "#f59e0b" },
  done: { label: "Completed", color: "#10b981" },
};

export function SetupError({ error }: { error: string }) {
  return (
    <div className="card p-8 max-w-xl mx-auto mt-10">
      <h1 className="text-xl font-bold text-heading mb-2">Can’t reach the database</h1>
      <p className="text-sm text-muted mb-4">{error}</p>
      <ol className="text-sm list-decimal pl-5 space-y-1">
        <li>Copy <code>.env.example</code> to <code>.env.local</code></li>
        <li>Set <code>MONGODB_URI</code> (MongoDB Atlas free tier works)</li>
        <li>Restart <code>npm run dev</code></li>
      </ol>
    </div>
  );
}

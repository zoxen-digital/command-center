"use client";
import { createContext, useCallback, useContext, useState } from "react";
import type { Occurrence } from "@/lib/tasks";
import TaskModal from "./TaskModal";
import { CheckCircle2, AlertCircle } from "lucide-react";

type TaskDefaults = Partial<Occurrence>;
type Ctx = {
  openTask: (t?: TaskDefaults) => void;
  toast: (msg: string, kind?: "ok" | "err") => void;
};

const C = createContext<Ctx>({ openTask: () => {}, toast: () => {} });
export const useApp = () => useContext(C);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<TaskDefaults | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: "ok" | "err" }[]>([]);

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <C.Provider value={{ openTask: (t) => setTask(t || {}), toast }}>
      {children}
      <TaskModal initial={task} onClose={() => setTask(null)} />
      <div className="fixed bottom-24 lg:bottom-6 right-4 left-4 sm:left-auto items-end z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="card flex items-center gap-2 px-4 py-3 text-sm font-medium" style={{ animation: "zx-slide-in .2s ease-out" }}>
            {t.kind === "ok" ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-red-500" />}
            {t.msg}
          </div>
        ))}
      </div>
    </C.Provider>
  );
}

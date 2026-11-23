"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, X } from "lucide-react";
import { api, localToday } from "@/lib/client";
import { parseVoice } from "@/lib/voice";
import { fmtDate, fmtTime } from "@/lib/dates";

const ERR: Record<string, string> = {
  "not-allowed": "Mic blocked hai. Site settings mein Microphone Allow karo.",
  "service-not-allowed": "Is browser mein voice band hai. Chrome mein kholo.",
  "no-speech": "Awaaz nahi aayi. Mic dabakar phir bolo.",
  "audio-capture": "Mic nahi mila, ya koi aur app use kar rahi hai.",
  network: "Voice ke liye internet chahiye.",
  "language-not-supported": "Ye language is phone par nahi hai. EN try karo.",
};

type State = { kind: "listening" | "saving" | "saved" | "error"; msg: string; taskId?: string };

/** Tap, speak, done: the task is saved automatically, with an Undo. */
export default function Voice({ projects }: { projects: any[] }) {
  const [st, setSt] = useState<State | null>(null);
  const [lang, setLang] = useState("hi-IN");
  const rec = useRef<any>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hide = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLang(localStorage.getItem("zx-voice-lang") || "hi-IN");
    return () => {
      const r = rec.current;
      rec.current = null;
      r?.abort();
      clearTimeout(timer.current);
      clearTimeout(hide.current);
    };
  }, []);

  function show(s: State | null, ms?: number) {
    clearTimeout(hide.current);
    setSt(s);
    if (ms) hide.current = setTimeout(() => setSt(null), ms);
  }

  function cancel() {
    const r = rec.current;
    rec.current = null;
    clearTimeout(timer.current);
    r?.abort();
    show(null);
  }

  async function save(text: string, l: string) {
    const p = parseVoice(text, localToday(), projects);
    if (!p.title) return show({ kind: "error", msg: `Suna: "${text}". Kaam ka naam bhi bolo.` }, 6000);
    show({ kind: "saving", msg: text });
    try {
      const t = await api("/api/tasks", "POST", {
        title: p.title, date: p.date, time: p.time, projectId: p.projectId, priority: p.priority || "medium", repeat: p.repeat || "none",
      });
      const when = [p.date ? fmtDate(p.date) : "Backlog", p.time && fmtTime(p.time), p.repeat].filter(Boolean).join(", ");
      show({ kind: "saved", msg: `${p.title} (${when})`, taskId: t._id }, 7000);
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(l === "en-IN" ? "Done, task added" : "हो गया, टास्क सेट है");
        u.lang = l;
        speechSynthesis.speak(u);
      }
    } catch (e) {
      show({ kind: "error", msg: `Save nahi hua: ${(e as Error).message}` }, 8000);
    }
  }

  function listen(l = lang) {
    if (st?.kind === "saving") return;
    cancel();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return show({ kind: "error", msg: "Is browser mein voice nahi hai. Chrome mein kholo." }, 6000);
    const r = new SR();
    let heard = "";
    let failed = "";
    rec.current = r;
    r.lang = l;
    r.interimResults = true;
    r.onresult = (e: any) => {
      if (rec.current !== r) return;
      // One utterance: the last result is the most complete (Android can repeat earlier ones).
      heard = e.results[e.results.length - 1][0].transcript.trim() || heard;
      setSt({ kind: "listening", msg: heard });
    };
    r.onerror = (e: any) => { failed = e.error; };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      clearTimeout(timer.current);
      if (heard && !failed) save(heard, l);
      else show({ kind: "error", msg: ERR[failed] || (failed ? `Voice error: ${failed}` : ERR["no-speech"]) }, 7000);
    };
    show({ kind: "listening", msg: "" });
    try {
      r.start();
    } catch (e) {
      rec.current = null;
      return show({ kind: "error", msg: (e as Error).message }, 6000);
    }
    // Some phones never end by themselves: stop after 15s, and force a result if that is ignored too.
    timer.current = setTimeout(() => {
      r.stop();
      timer.current = setTimeout(() => r.onend(), 2000);
    }, 15_000);
  }

  function switchLang() {
    const l = lang === "hi-IN" ? "en-IN" : "hi-IN";
    setLang(l);
    localStorage.setItem("zx-voice-lang", l);
    listen(l);
  }

  async function undo(id: string) {
    try {
      await api(`/api/tasks/${id}`, "DELETE");
      show({ kind: "saved", msg: "Task hata diya" }, 2500);
    } catch (e) {
      show({ kind: "error", msg: (e as Error).message }, 6000);
    }
  }

  const listening = st?.kind === "listening";
  return (
    <>
      <button type="button" onClick={() => (listening ? rec.current?.stop() : listen())} aria-label="Add task by voice"
        className={`btn btn-primary !px-0 !w-10 !h-10 sm:!w-11 sm:!h-11 ${listening ? "animate-pulse" : ""}`}><Mic size={18} /></button>
      {/* Portal: the header's backdrop-filter would otherwise trap fixed elements inside it. */}
      {st && createPortal(
        <div role="status" className="fixed z-[65] bottom-28 lg:bottom-8 inset-x-4 mx-auto max-w-md rounded-3xl bg-navy text-white p-4 flex items-center gap-3 shadow-2xl border border-white/10">
          <span className={`size-10 shrink-0 rounded-full flex items-center justify-center ${st.kind === "error" ? "bg-red-500" : st.kind === "saved" ? "bg-emerald-500" : "bg-brand-gradient"} ${listening ? "animate-pulse" : ""}`}><Mic size={18} /></span>
          <div className="flex-1 min-w-0 text-sm">
            <div className="text-xs text-white/60">{{ listening: "Sun raha hoon…", saving: "Save ho raha hai…", saved: "Ho gaya", error: "Dobara try karo" }[st.kind]}</div>
            <div className="font-semibold break-words">{st.msg || "Boliye"}</div>
          </div>
          {listening && <button onClick={switchLang} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-white/10">{lang === "hi-IN" ? "HI" : "EN"}</button>}
          {st.kind === "saved" && st.taskId && <button onClick={() => undo(st.taskId!)} className="text-xs font-bold px-2 py-1.5 rounded-lg bg-white/10">Undo</button>}
          {st.kind !== "saving" && <button onClick={cancel} aria-label="Close" className="p-1.5"><X size={16} /></button>}
        </div>,
        document.body,
      )}
    </>
  );
}

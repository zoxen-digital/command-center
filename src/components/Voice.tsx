"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, X } from "lucide-react";
import { api, localToday } from "@/lib/client";
import { parseVoice } from "@/lib/voice";
import { fmtDate, fmtTime } from "@/lib/dates";

const MIC_ERR: Record<string, string> = {
  NotAllowedError: "Mic blocked hai. Site settings mein Microphone Allow karo.",
  NotFoundError: "Mic nahi mila.",
  NotReadableError: "Mic koi aur app use kar rahi hai. Use band karo.",
};
const LABEL = { starting: "Mic khul raha hai…", listening: "Sun raha hoon…", saving: "Samajh raha hoon…", saved: "Ho gaya", error: "Nahi hua" };

type State = { kind: keyof typeof LABEL; msg: string; taskId?: string };
type Session = { alive: boolean; finish: () => void; cleanup: () => void };

/** Tap and speak. Recording stops by itself after a pause and the task is saved, with an Undo. */
export default function Voice({ projects }: { projects: any[] }) {
  const [st, setSt] = useState<State | null>(null);
  const [lang, setLang] = useState("hi-IN");
  const [typed, setTyped] = useState("");
  const [level, setLevel] = useState(0);
  const session = useRef<Session | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLang(localStorage.getItem("zx-voice-lang") || "hi-IN");
    return () => {
      session.current?.cleanup();
      clearTimeout(hide.current);
    };
  }, []);

  function show(s: State | null, ms?: number) {
    clearTimeout(hide.current);
    setSt(s);
    if (ms) hide.current = setTimeout(() => setSt(null), ms);
  }
  const fail = (msg: string) => {
    setTyped("");
    show({ kind: "error", msg });
  };
  function cancel() {
    session.current?.cleanup();
    session.current = null;
    show(null);
  }

  async function save(text: string, l: string) {
    const p = parseVoice(text, localToday(), projects);
    if (!p.title) return fail(`Suna: "${text}". Kaam ka naam bhi bolo.`);
    show({ kind: "saving", msg: text });
    try {
      const t = await api("/api/tasks", "POST", {
        title: p.title, date: p.date, time: p.time, projectId: p.projectId, priority: p.priority || "medium", repeat: p.repeat || "none",
      });
      const when = [p.date ? fmtDate(p.date) : "Backlog", p.time && fmtTime(p.time), p.repeat].filter(Boolean).join(", ");
      show({ kind: "saved", msg: `${p.title} (${when})`, taskId: t._id }, 8000);
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(l === "en-IN" ? "Done, task added" : "हो गया, टास्क सेट है");
        u.lang = l;
        speechSynthesis.speak(u);
      }
    } catch (e) {
      fail(`Save nahi hua: ${(e as Error).message}`);
    }
  }

  async function listen(l = lang) {
    if (st?.kind === "saving") return;
    cancel();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return fail("Is browser mein recording nahi hoti. Chrome mein kholo.");
    show({ kind: "starting", msg: "" });
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let tick: ReturnType<typeof setInterval> | undefined;
    const s: Session = {
      alive: true,
      finish: () => {},
      cleanup: () => {
        s.alive = false;
        clearInterval(tick);
        stream?.getTracks().forEach((t) => t.stop());
        ctx?.close().catch(() => {});
        ctx = null;
        setLevel(0);
      },
    };
    session.current = s;
    try {
      ctx = new AudioContext();
      const resumed = ctx.resume().catch(() => {});
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!s.alive) return stream.getTracks().forEach((t) => t.stop());
      await Promise.race([resumed, new Promise((r) => setTimeout(r, 500))]);
      if (!s.alive || !ctx) return;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const metered = ctx.state === "running";

      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      let peak = 0;
      let floor = 1;
      let lastVoice = 0;
      const started = Date.now();

      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        if (!s.alive) return;
        s.cleanup();
        if (metered && peak < 0.002) return fail("Mic se bilkul awaaz nahi aa rahi. Phone ki mic permission check karo.");
        show({ kind: "saving", msg: "" });
        const type = rec.mimeType || "audio/webm";
        const form = new FormData();
        form.append("audio", new File(chunks, type.includes("mp4") ? "voice.mp4" : "voice.webm", { type }));
        form.append("lang", l.slice(0, 2));
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const d = await res.json().catch(() => ({}));
          if (res.status === 401) return window.location.assign("/login");
          if (session.current !== s) return;
          if (!res.ok) return fail(d.error || `Error ${res.status}`);
          if (!d.text) return fail("Shabd samajh nahi aaye. Phir bolo.");
          await save(d.text, l);
        } catch {
          if (session.current === s) fail("Internet check karo aur phir bolo.");
        }
      };
      s.finish = () => { if (rec.state !== "inactive") rec.stop(); };
      rec.start(250);
      show({ kind: "listening", msg: "" });

      tick = setInterval(() => {
        const age = Date.now() - started;
        if (metered) {
          analyser.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((n, v) => n + v * v, 0) / buf.length);
          peak = Math.max(peak, rms);
          floor = Math.min(floor, Math.max(rms, 0.001));
          setLevel(Math.min(1, rms * 12));
          if (rms > Math.max(0.01, floor * 3)) lastVoice = Date.now();
          if (lastVoice && Date.now() - lastVoice > 1800) return s.finish(); // paused after speaking
        }
        if (age > (lastVoice ? 20_000 : 8_000)) s.finish();
      }, 100);
    } catch (e) {
      const alive = s.alive;
      s.cleanup();
      if (alive) fail(MIC_ERR[(e as Error).name] || `Mic error: ${(e as Error).message}`);
    }
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
      fail((e as Error).message);
    }
  }

  const listening = st?.kind === "listening";
  const pill = "text-xs font-bold px-2.5 py-2 rounded-lg bg-white/15";
  return (
    <>
      <button type="button" onClick={() => (listening ? session.current?.finish() : listen())} aria-label={listening ? "Stop and save" : "Add task by voice"}
        className="btn btn-primary !px-0 !w-10 !h-10 sm:!w-11 sm:!h-11"><Mic size={18} /></button>
      {/* Portal: the header's backdrop-filter would otherwise trap fixed elements inside it. */}
      {st && createPortal(
        <div role="status" className="fixed z-[65] bottom-28 lg:bottom-8 inset-x-4 mx-auto max-w-md rounded-3xl bg-navy text-white p-4 flex items-center gap-3 shadow-2xl border border-white/10">
          <span className={`size-10 shrink-0 rounded-full flex items-center justify-center ${st.kind === "error" ? "bg-red-500" : st.kind === "saved" ? "bg-emerald-500" : "bg-brand-gradient"}`}
            style={listening ? { boxShadow: `0 0 0 ${level * 12}px rgba(108,59,245,.35)` } : undefined}><Mic size={18} /></span>
          <div className="flex-1 min-w-0 text-sm">
            <div className="text-xs text-white/60">{LABEL[st.kind]}</div>
            <div className="font-semibold break-words">{st.msg || (listening ? "Boliye" : "")}</div>
            {st.kind === "error" && (
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) save(typed.trim(), lang); }}>
                <input aria-label="Type the task" className="flex-1 min-w-0 h-10 rounded-xl bg-white/10 px-3 text-base outline-none placeholder:text-white/50" placeholder="Ya yahan likho" value={typed} onChange={(e) => setTyped(e.target.value)} />
                <button className={pill}>Save</button>
              </form>
            )}
          </div>
          {listening && <button onClick={switchLang} className={pill}>{lang === "hi-IN" ? "HI" : "EN"}</button>}
          {listening && <button onClick={() => session.current?.finish()} className={pill}>Done</button>}
          {st.kind === "saved" && st.taskId && <button onClick={() => undo(st.taskId!)} className={pill}>Undo</button>}
          {st.kind !== "saving" && <button onClick={cancel} aria-label="Close" className="p-1.5"><X size={16} /></button>}
        </div>,
        document.body,
      )}
    </>
  );
}

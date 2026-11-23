"use client";
import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Modal } from "./ui";
import { useApp } from "./Providers";
import { api, localToday } from "@/lib/client";
import { parseVoice } from "@/lib/voice";
import { fmtDate, fmtTime } from "@/lib/dates";

const ERR: Record<string, string> = {
  "not-allowed": "Microphone is blocked. Allow it in the browser settings.",
  "no-speech": "I did not hear anything. Try again.",
  "audio-capture": "No microphone found.",
  network: "Voice needs an internet connection.",
};

export default function Voice({ projects }: { projects: any[] }) {
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [lang, setLang] = useState("hi-IN");
  const rec = useRef<any>(null);
  const { toast, openTask } = useApp();

  useEffect(() => {
    setLang(localStorage.getItem("zx-voice-lang") || "hi-IN");
    return () => rec.current?.abort();
  }, []);

  const stop = () => {
    const r = rec.current;
    rec.current = null;
    r?.abort();
    setOn(false);
  };
  const close = () => {
    stop();
    setOpen(false);
  };

  function listen(l = lang) {
    stop();
    setOpen(true);
    setText("");
    setErr("");
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return setErr("This browser has no voice input. Use Chrome, or type below.");
    const r = new SR();
    rec.current = r;
    r.lang = l;
    r.interimResults = true;
    r.onresult = (e: any) => {
      if (rec.current === r) setText(Array.from(e.results).map((x: any) => x[0].transcript).join(" "));
    };
    r.onerror = (e: any) => {
      if (rec.current === r && e.error !== "aborted") setErr(ERR[e.error] || `Voice error: ${e.error}`);
    };
    r.onend = () => {
      if (rec.current === r) setOn(false);
    };
    try {
      r.start();
      setOn(true);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const p = text.trim() ? parseVoice(text, localToday(), projects) : null;
  const proj = projects.find((x) => x.id === p?.projectId);
  const fields = p && { title: p.title, date: p.date, time: p.time, projectId: p.projectId, priority: p.priority || "medium", repeat: p.repeat || "none" };

  async function save() {
    if (!fields?.title) return;
    setBusy(true);
    try {
      await api("/api/tasks", "POST", fields);
      toast(`Added: ${fields.title}`);
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(lang === "en-IN" ? "Done, task added" : "हो गया, टास्क सेट है");
        u.lang = lang;
        speechSynthesis.speak(u);
      }
      close();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => listen()} className="btn btn-primary !px-0 !w-10 !h-10 sm:!w-11 sm:!h-11" aria-label="Add task by voice"><Mic size={18} /></button>
      <Modal open={open} onClose={close} title="Voice task">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button onClick={() => (on ? rec.current?.stop() : listen())} aria-label={on ? "Stop" : "Speak again"}
              className={`size-16 shrink-0 rounded-full bg-brand-gradient text-white flex items-center justify-center ${on ? "animate-pulse" : ""}`}><Mic size={26} /></button>
            <div className="text-sm text-muted">{on ? "Listening…" : "Tap the mic to speak again, or edit the text."}</div>
            <select aria-label="Language" className="input !w-auto ml-auto" value={lang}
              onChange={(e) => { setLang(e.target.value); localStorage.setItem("zx-voice-lang", e.target.value); listen(e.target.value); }}>
              <option value="hi-IN">Hindi</option>
              <option value="en-IN">English</option>
            </select>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <textarea className="input" rows={2} value={text} placeholder="Kal shaam 5 baje client ko call karna hai" onChange={(e) => { stop(); setText(e.target.value); }} />
          {p && (
            <div className="rounded-2xl bg-surface-2 p-4">
              <div className="font-semibold mb-2">{p.title || "Task name missing"}</div>
              <div className="flex flex-wrap gap-3 text-xs text-muted">
                <span>{p.date ? fmtDate(p.date) : "Backlog"}</span>
                {p.time && <span>{fmtTime(p.time)}</span>}
                {p.repeat && <span>{p.repeat}</span>}
                {p.priority && <span>{p.priority}</span>}
                {proj && <span style={{ color: proj.color }}>{proj.name}</span>}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn btn-outline" disabled={!p?.title} onClick={() => { close(); openTask(fields!); }}>Edit</button>
            <button className="btn btn-primary" disabled={!p?.title || busy} onClick={save}>{busy ? "Saving…" : "Save task"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

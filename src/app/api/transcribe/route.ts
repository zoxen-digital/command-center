import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Recorded audio -> text, using Groq's hosted Whisper. Protected by the app lock (middleware).
export async function POST(req: Request) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
  const key = process.env.GROQ_API_KEY;
  if (!key) return fail("GROQ_API_KEY server par set nahi hai.", 503);
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || !audio.size) return fail("Recording khaali hai.", 400);
    if (audio.size > 4_000_000) return fail("Recording bahut lambi hai.", 413);
    const out = new FormData();
    out.append("file", audio, audio.name || "voice.webm");
    out.append("model", "whisper-large-v3-turbo");
    out.append("language", form.get("lang") === "en" ? "en" : "hi");
    out.append("temperature", "0");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: out, signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[transcribe]", res.status, data?.error?.message);
      return fail(res.status === 429 ? "Free limit abhi khatam hai. Thodi der baad try karo." : res.status === 401 ? "Groq key galat hai." : `Groq error ${res.status}`, 502);
    }
    return NextResponse.json({ text: String(data.text || "").trim() });
  } catch (e) {
    console.error(e);
    return fail("Voice server se jawab nahi aaya. Phir try karo.", 502);
  }
}

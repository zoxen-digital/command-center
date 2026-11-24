import { NextResponse } from "next/server";
import { dbConnect, LoginAttempt } from "@/lib/db";
import { COOKIE, authToken, safeEqual } from "@/lib/lock";

export const dynamic = "force-dynamic";
const MAX = 10; // attempts per IP per 15 minutes (the records expire by themselves)

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.json({ error: "APP_PASSWORD is not set on the server." }, { status: 503 });
  try {
    await dbConnect();
    const ip = (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "local").trim();
    const since = new Date(Date.now() - 15 * 60_000);
    if ((await LoginAttempt.countDocuments({ ip, at: { $gt: since } })) >= MAX)
      return NextResponse.json({ error: "Too many tries. Wait 15 minutes." }, { status: 429 });
    await LoginAttempt.create({ ip });
    const body = await req.json().catch(() => ({}));
    if (!safeEqual(await authToken(String(body.password || " ")), await authToken(password)))
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    await LoginAttempt.deleteMany({ ip });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, await authToken(password), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed. Try again." }, { status: 500 });
  }
}

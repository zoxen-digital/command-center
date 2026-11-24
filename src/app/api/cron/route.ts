import { NextResponse } from "next/server";
import { tick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// Deployed (e.g. Vercel): ping GET /api/cron?key=CRON_SECRET every minute from cron-job.org (free).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret ? key !== secret : process.env.NODE_ENV === "production") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await tick());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

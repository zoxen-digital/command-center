import { NextResponse } from "next/server";
import { dbConnect, getSettings } from "./db";
import { ensureSeed } from "./seed";
import { nowIn } from "./dates";

type Handler<C> = (req: Request, ctx: C) => Promise<unknown>;

/** Wraps a route: connects to Mongo, returns JSON, turns thrown errors into { error }. */
export function route<C = unknown>(fn: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      await dbConnect();
      await ensureSeed();
      const data = await fn(req, ctx);
      return data instanceof Response ? data : NextResponse.json(data ?? { ok: true });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: (e as Error).message || "Something went wrong" }, { status: 400 });
    }
  };
}

export async function today() {
  const s = await getSettings();
  return nowIn(s.timezone || "Asia/Karachi");
}

/** Keep only allowed keys from a request body. */
export function pick<T extends Record<string, unknown>>(body: T, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in body) out[k] = body[k] === "" && k !== "notes" && k !== "description" && k !== "body" && k !== "title" ? null : body[k];
  return out;
}

export type Ctx = { params: Promise<{ id: string }> };

import { route, pick } from "@/lib/api";
import { NOTE_FIELDS } from "@/lib/fields";
import { Note, plain } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const pid = new URL(req.url).searchParams.get("projectId");
  return plain(await Note.find(pid ? { projectId: pid } : {}).sort({ pinned: -1, updatedAt: -1 }).lean());
});

export const POST = route(async (req) => {
  const body = await req.json();
  if (!body.title?.trim() && !body.body?.trim()) throw new Error("Write something first");
  return plain(await Note.create(pick(body, NOTE_FIELDS)));
});

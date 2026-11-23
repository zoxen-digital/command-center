import { route, pick, type Ctx } from "@/lib/api";
import { Note, plain } from "@/lib/db";
import { NOTE_FIELDS } from "@/lib/fields";

export const dynamic = "force-dynamic";

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  return plain(await Note.findByIdAndUpdate(id, pick(await req.json(), NOTE_FIELDS), { new: true }));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  await Note.findByIdAndDelete(id);
  return { ok: true };
});

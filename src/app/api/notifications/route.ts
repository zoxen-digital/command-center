import { route } from "@/lib/api";
import { Notification, plain } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const [items, unread] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ read: false }),
  ]);
  return { items: plain(items), unread };
});

// POST { action: "readAll" } | { action: "shown", ids: [] } | { action: "clear" }
export const POST = route(async (req) => {
  const { action, ids } = await req.json();
  if (action === "readAll") await Notification.updateMany({ read: false }, { read: true, shown: true });
  if (action === "shown") await Notification.updateMany({ _id: { $in: ids || [] } }, { shown: true });
  if (action === "clear") await Notification.deleteMany({});
  return { ok: true };
});

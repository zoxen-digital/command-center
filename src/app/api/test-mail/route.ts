import { route } from "@/lib/api";
import { getSettings } from "@/lib/db";
import { sendMail, row, appUrl } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  const s = await getSettings();
  const to = process.env.NOTIFY_EMAIL || s.notifyEmail;
  if (!to) throw new Error("Add a notification email first");
  await sendMail({
    to, subject: "✅ Zoxen Dashboard email works", heading: "Email reminders are working",
    html: row("You will get task reminders, a morning plan and an evening review at this address."),
    button: { label: "Open dashboard", url: appUrl("/") },
  });
  return { ok: true, to };
});

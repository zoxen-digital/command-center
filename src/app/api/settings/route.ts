import { route } from "@/lib/api";
import { getSettings, plain } from "@/lib/db";
import { mailEnabled } from "@/lib/mailer";

export const dynamic = "force-dynamic";
const FIELDS = ["ownerName", "timezone", "notifyEmail", "emailReminders", "digestEnabled", "digestTime", "eveningEnabled", "eveningTime"];

export const GET = route(async () => ({ ...plain((await getSettings()).toJSON()), mailReady: mailEnabled(), smtpUser: process.env.SMTP_USER || "" }));

export const PATCH = route(async (req) => {
  const body = await req.json();
  const s = await getSettings();
  for (const k of FIELDS) if (k in body) s.set(k, body[k]);
  if (body.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: body.timezone });
    } catch {
      throw new Error("Unknown timezone");
    }
  }
  await s.save();
  return plain(s.toJSON());
});

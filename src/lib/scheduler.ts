import { Task, Notification, getSettings, dbConnect } from "./db";
import { nowIn, toMinutes, fmtTime, addDays } from "./dates";
import { occurrencesBetween, overdue, type Occurrence } from "./tasks";
import { sendMail, mailEnabled, esc, row, appUrl } from "./mailer";

/**
 * One scheduler tick. Safe to call every minute:
 *  - task reminders (in-app + email) when a task's reminder time arrives
 *  - morning digest (today's plan) and evening review (what's left / tomorrow)
 */
export async function tick() {
  await dbConnect();
  const s = await getSettings();
  const { date: today, minutes: now } = nowIn(s.timezone || "Asia/Karachi");
  const to = process.env.NOTIFY_EMAIL || s.notifyEmail || "";
  const canMail = mailEnabled() && !!to;
  const log: string[] = [];

  // 1) Reminders
  const todays = await occurrencesBetween(today, today);
  for (const o of todays) {
    if (o.done || !o.time || o.remindBefore < 0) continue;
    const at = toMinutes(o.time) - o.remindBefore;
    if (now < at || now > toMinutes(o.time) + 60) continue; // window: reminder time .. 1h after start
    // Claim atomically so two ticks never double-send.
    const claimed = await Task.updateOne({ _id: o.id, notified: { $ne: today } }, { $push: { notified: today } });
    if (!claimed.modifiedCount) continue;
    const when = o.remindBefore > 0 && now < toMinutes(o.time) ? `in ${toMinutes(o.time) - now} min` : "now";
    const title = `⏰ ${o.title}`;
    const body = `${fmtTime(o.time)} (${when})${o.project ? ` · ${o.project.name}` : ""}`;
    await Notification.create({ title, body, taskId: o.id });
    if (canMail && s.emailReminders) {
      try {
        await sendMail({
          to, subject: `${title} — ${fmtTime(o.time)}`, heading: o.title,
          html: row(`<b>Starts:</b> ${esc(fmtTime(o.time))} (${esc(when)})`) +
            (o.project ? row(`<b>Project:</b> ${esc(o.project.name)}`) : "") +
            (o.notes ? row(esc(o.notes).replace(/\n/g, "<br>"), true) : ""),
          button: { label: "Open today's plan", url: appUrl("/today") },
        });
      } catch (e) {
        log.push(`mail failed: ${(e as Error).message}`);
      }
    }
    log.push(`reminded: ${o.title}`);
  }

  // 2) Morning digest
  if (s.digestEnabled && s.lastDigest !== today && now >= toMinutes(s.digestTime || "08:00")) {
    s.lastDigest = today;
    await s.save();
    const late = await overdue(today);
    await Notification.create({ title: "☀️ Good morning", body: `${todays.filter((o) => !o.done).length} tasks today, ${late.length} overdue.` });
    if (canMail) {
      try {
        await sendMail({
          to, subject: `☀️ Today's plan — ${todays.length} task${todays.length === 1 ? "" : "s"}`,
          heading: `Good morning, ${s.ownerName || "there"}!`,
          html: listHtml("Today", todays) + (late.length ? listHtml("Overdue (still pending)", late, true) : ""),
          button: { label: "Open dashboard", url: appUrl("/") },
        });
      } catch (e) {
        log.push(`digest failed: ${(e as Error).message}`);
      }
    }
    log.push("morning digest");
  }

  // 3) Evening review
  if (s.eveningEnabled && s.lastEvening !== today && now >= toMinutes(s.eveningTime || "21:30")) {
    s.lastEvening = today;
    await s.save();
    const left = todays.filter((o) => !o.done);
    const tomorrow = await occurrencesBetween(addDays(today, 1), addDays(today, 1));
    const done = todays.length - left.length;
    await Notification.create({ title: "🌙 Day review", body: `Done ${done}/${todays.length}. Tomorrow: ${tomorrow.length} tasks.` });
    if (canMail) {
      try {
        await sendMail({
          to, subject: `🌙 Day review — ${done}/${todays.length} done`, heading: "How did today go?",
          html: row(`You finished <b>${done}</b> of <b>${todays.length}</b> tasks today.`) +
            (left.length ? listHtml("Not finished (move or reschedule)", left, true) : row("Everything is done. 🎉")) +
            listHtml("Tomorrow", tomorrow),
          button: { label: "Plan tomorrow", url: appUrl("/planner") },
        });
      } catch (e) {
        log.push(`evening failed: ${(e as Error).message}`);
      }
    }
    log.push("evening review");
  }
  return { today, now, log };
}

function listHtml(title: string, items: Occurrence[], warn = false) {
  const head = `<tr><td style="padding:16px 32px 4px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${warn ? "#e5484d" : "#6b7085"}">${esc(title)}</td></tr>`;
  if (!items.length) return head + row("Nothing planned.", true);
  return head + items.map((o) =>
    row(`${o.done ? "✅" : "▫️"} <b>${esc(o.time ? fmtTime(o.time) : "Any time")}</b> — ${esc(o.title)}${o.project ? ` <span style="color:${esc(o.project.color)}">· ${esc(o.project.name)}</span>` : ""}${warn && o.occ ? ` <span style="color:#6b7085">(${esc(o.occ)})</span>` : ""}`),
  ).join("");
}

/** Local / self-hosted mode: run the tick every minute inside the Next.js server. */
export function startScheduler() {
  const g = globalThis as unknown as { _zxTimer?: NodeJS.Timeout };
  if (g._zxTimer || !process.env.MONGODB_URI) return;
  const run = () => tick().catch((e) => console.error("[scheduler]", e.message));
  g._zxTimer = setInterval(run, 60_000);
  setTimeout(run, 5_000);
  console.log("[scheduler] reminders running every minute");
}

import nodemailer, { type Transporter } from "nodemailer";

const g = globalThis as unknown as { _mailer?: Transporter };

export function mailEnabled() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  if (!g._mailer) {
    const port = Number(process.env.SMTP_PORT || 465);
    g._mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      // Gmail: SMTP_USER = Gmail address, SMTP_PASS = 16-character App Password.
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS?.replace(/\s+/g, "") },
    });
  }
  return g._mailer;
}

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function appUrl(path = "") {
  let base = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!base && process.env.VERCEL_PROJECT_PRODUCTION_URL) base = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return (base || "http://localhost:3000").replace(/\/$/, "") + path;
}

type Mail = {
  to: string;
  subject: string;
  heading: string;
  /** Pre-built safe HTML rows (use esc() on user text). */
  html: string;
  button?: { label: string; url: string };
};

/** Branded Zoxen email. Throws on failure so callers can decide. */
export async function sendMail(m: Mail) {
  if (!mailEnabled()) throw new Error("Email is not set up. Add SMTP_USER and SMTP_PASS to .env.local.");
  const button = m.button
    ? `<tr><td style="padding:8px 32px 28px"><a href="${esc(m.button.url)}" style="display:inline-block;background:#2639e8;background-image:linear-gradient(90deg,#2639e8,#6c3bf5);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px">${esc(m.button.label)}</a></td></tr>`
    : '<tr><td style="padding:12px"></td></tr>';
  const html = `<!doctype html><html><body style="margin:0;background:#eef0f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1a1d2e">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f5;padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0b1020;background-image:linear-gradient(90deg,#2639e8,#6c3bf5);padding:20px 32px;color:#fff;font-size:16px;font-weight:700">Zoxen Command Center</td></tr>
<tr><td style="padding:26px 32px 6px;font-size:20px;font-weight:700;color:#0b1020">${esc(m.heading)}</td></tr>
${m.html}
${button}
</table></td></tr></table></body></html>`;
  await transporter().sendMail({
    from: `"${process.env.MAIL_FROM_NAME || "Zoxen Dashboard"}" <${process.env.SMTP_USER}>`,
    to: m.to,
    subject: m.subject,
    html,
  });
}

export function row(text: string, muted = false) {
  return `<tr><td style="padding:5px 32px;font-size:14px;line-height:1.6;color:${muted ? "#6b7085" : "#3a3f55"}">${text}</td></tr>`;
}

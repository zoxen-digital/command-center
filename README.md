# Zoxen Command Center

Personal dashboard: projects + phases + progress, day/week planner, repeating tasks, notes, and reminders (email + browser).

## Setup
1. `copy .env.example .env.local` and fill in:
   - `MONGODB_URI`: MongoDB Atlas (free) or a local MongoDB
   - `SMTP_USER` / `SMTP_PASS`: Gmail address + 16-character **App Password** (Google Account → Security → 2-Step Verification → App passwords)
2. `npm install`
3. `npm run dev`, then open http://localhost:3000

On the first run, your 7 projects (Dashboard, Game, CRM, Sales Agent, IlmConnect, Tools, Demos) are added automatically.

## Reminders
- **Running locally / on a VPS (`npm run dev` or `npm start`)**: a built-in scheduler checks every minute. Nothing else is needed.
- **On Vercel**: there is no always-on server. Create a free job at cron-job.org that calls
  `https://YOUR-DOMAIN/api/cron?key=YOUR_CRON_SECRET` every minute.
- Each check sends: task reminders (X min before), the morning plan (default 08:00) and the evening review (21:30). Times and timezone are in Settings.
- Browser pop-ups + sound: Settings → Enable browser notifications (works while a tab is open).

## Quick add (top bar)
`Call client tomorrow 5pm #sales !high` · `Gym every day 7am` · `Send invoice fri 15:00 30m before` · plain text = backlog.
Words understood: today/aaj, tomorrow/kal, mon…sun, next week, in 3 days, 25/12, daily/roz, weekdays, weekly, monthly, !high/!low, #project.

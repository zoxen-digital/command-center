// Starts the minute-by-minute reminder loop when running as a normal Node server (npm run dev / npm start).
// On Vercel there is no long-running server, so call /api/cron every minute instead (see README).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.VERCEL) {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}

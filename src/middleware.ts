import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, authToken, safeEqual } from "@/lib/lock";

// Everything needs the password, except the login itself, the cron (own secret) and public app files.
// If APP_PASSWORD is missing the app stays locked rather than open.
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const cookie = req.cookies.get(COOKIE)?.value || "";
  if (password && cookie && safeEqual(cookie, await authToken(password))) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Locked. Please log in." }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!login$|api/login$|api/cron$|_next/static/|_next/image|icons/|icon\\.svg$|sw\\.js$|manifest\\.webmanifest$|favicon\\.ico$).*)"],
};

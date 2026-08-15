import { NextRequest, NextResponse } from "next/server";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

const PUBLIC_PATHS = ["/", "/verify"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    // Inngest calls this endpoint directly (sync + step execution) using its own signing-key
    // verification, not a user session cookie — must stay outside the auth gate.
    pathname.startsWith("/api/inngest") ||
    // Hit by an external cron (e.g. cron-job.org), not a logged-in browser — protects itself
    // with its own CRON_SECRET check instead of a session cookie.
    pathname.startsWith("/api/cron") ||
    // MCP server (for ChatGPT/Codex/Claude) — authenticates via its own OAuth bearer token /
    // shared secret, not the app's session cookie. See src/features/mcp.
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;

  if (!user) {
    const loginUrl = new URL("/", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

// Requires the Node.js runtime (not Edge) since session lookup hits Supabase via the
// service-role client and hashes tokens with Node's crypto module.
export const runtime = "nodejs";

const PUBLIC_PATHS = ["/", "/verify"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    // Inngest calls this endpoint directly (sync + step execution) using its own signing-key
    // verification, not a user session cookie — must stay outside the auth gate.
    pathname.startsWith("/api/inngest") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
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

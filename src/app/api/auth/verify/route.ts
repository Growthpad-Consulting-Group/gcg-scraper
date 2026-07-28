import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/features/auth/api/magic-link";
import { createSession, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function POST(req: NextRequest) {
  const { token, email } = await req.json();
  if (!token || !email) {
    return NextResponse.json({ error: "Token and email are required" }, { status: 400 });
  }

  const userId = await consumeMagicLink(token, email);
  if (!userId) {
    return NextResponse.json({ error: "Link is invalid or expired" }, { status: 401 });
  }

  const { token: sessionToken, expiresAt } = await createSession(userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return res;
}

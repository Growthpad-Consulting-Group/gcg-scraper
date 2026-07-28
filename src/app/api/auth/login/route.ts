import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/features/auth/api/password";
import { createSession, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const userId = await verifyPassword(email, password);
  if (!userId) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(userId);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return res;
}

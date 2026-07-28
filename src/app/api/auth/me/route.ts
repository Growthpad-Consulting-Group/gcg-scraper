import { NextRequest, NextResponse } from "next/server";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const user = await getUserForSessionToken(token);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({ user });
}

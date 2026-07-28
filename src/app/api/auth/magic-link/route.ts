import { NextRequest, NextResponse } from "next/server";
import { issueMagicLink } from "@/features/auth/api/magic-link";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  await issueMagicLink(email);
  return NextResponse.json({ ok: true });
}

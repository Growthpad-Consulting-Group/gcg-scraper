import { NextResponse } from "next/server";
import { getAllProviderUsage } from "@/shared/lib/providerUsage";

export async function GET() {
  const usage = await getAllProviderUsage();
  return NextResponse.json({ usage });
}

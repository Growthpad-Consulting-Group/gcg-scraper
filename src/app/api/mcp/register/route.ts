import { NextRequest } from "next/server";
import { registerClient } from "@/features/mcp/oauth";

export async function POST(req: NextRequest) {
  return registerClient(req);
}

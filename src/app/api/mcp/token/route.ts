import { NextRequest } from "next/server";
import { issueToken } from "@/features/mcp/oauth";

export async function POST(req: NextRequest) {
  return issueToken(req);
}

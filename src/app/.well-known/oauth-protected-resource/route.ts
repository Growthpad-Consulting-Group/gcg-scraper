import { NextRequest } from "next/server";
import { protectedResourceMetadata } from "@/features/mcp/oauth";

export async function GET(req: NextRequest) {
  return Response.json(protectedResourceMetadata(req));
}

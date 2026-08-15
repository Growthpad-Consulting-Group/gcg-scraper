import { NextRequest } from "next/server";
import { authorizationServerMetadata } from "@/features/mcp/oauth";

export async function GET(req: NextRequest) {
  return Response.json(authorizationServerMetadata(req));
}

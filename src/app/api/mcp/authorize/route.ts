import { NextRequest } from "next/server";
import { authorizeGet, authorizePost } from "@/features/mcp/oauth";

export async function GET(req: NextRequest) {
  return authorizeGet(req);
}

export async function POST(req: NextRequest) {
  return authorizePost(req);
}

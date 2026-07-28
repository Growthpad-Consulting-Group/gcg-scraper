import { NextRequest } from "next/server";
import { listKeywords, createKeyword, bulkDeleteKeywords } from "@/features/keywords/api/crud";

const TABLE = "base_keywords";
const KEY = "keyword";

export async function GET() {
  return listKeywords(TABLE, KEY);
}

export async function POST(req: NextRequest) {
  return createKeyword(req, TABLE, KEY);
}

export async function DELETE(req: NextRequest) {
  return bulkDeleteKeywords(req, TABLE);
}

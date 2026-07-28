import { NextRequest } from "next/server";
import { updateKeyword, deleteKeyword } from "@/features/keywords/api/crud";

const TABLE = "relevant_keywords";
const KEY = "keyword";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return updateKeyword(req, TABLE, KEY, id);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return deleteKeyword(TABLE, id);
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { createKeyword, bulkDeleteKeywords } from "@/features/keywords/api/crud";

const TABLE = "linkedin_search_phrases";
const KEY = "phrase";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: linkedin_search_phrases, error } = await supabase.from(TABLE).select(`id, ${KEY}, created_at`).order(KEY);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ linkedin_search_phrases });
}

export async function POST(req: NextRequest) {
  return createKeyword(req, TABLE, KEY);
}

export async function DELETE(req: NextRequest) {
  return bulkDeleteKeywords(req, TABLE);
}

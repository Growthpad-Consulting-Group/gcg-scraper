import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  const supabase = createServerSupabaseClient();

  let request = supabase.from("tenders").select("*").order("scraped_at", { ascending: false });
  if (query) {
    request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }

  const { data: tenders, error } = await request;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenders });
}

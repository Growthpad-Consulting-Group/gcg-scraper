import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  const supabase = createServerSupabaseClient();

  let request = supabase.from("linkedin_leads").select("*").order("created_at", { ascending: false });
  if (query) {
    request = request.or(`full_name.ilike.%${query}%,headline.ilike.%${query}%,current_company.ilike.%${query}%`);
  }

  const { data: leads, error } = await request;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads });
}

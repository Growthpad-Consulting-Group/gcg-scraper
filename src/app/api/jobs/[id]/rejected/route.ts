import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: rejected, error } = await supabase
    .from("rejected_tenders")
    .select("id, title, source_url, organization, category, location, reason, rejected_at")
    .eq("job_id", id)
    .order("rejected_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rejected: rejected ?? [] });
}

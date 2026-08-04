import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("scrape_jobs")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["queued", "running"])
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Job not found or already finished" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

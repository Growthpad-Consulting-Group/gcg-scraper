import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: website, error: fetchError } = await supabase.from("websites").select("id, name").eq("id", id).maybeSingle();
  if (fetchError || !website) return NextResponse.json({ error: fetchError?.message || "Website not found" }, { status: 404 });

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ status: "queued", kind: "tender-website", label: website.name || `Website #${website.id}` })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 });

  await inngest.send({ name: "tenders/website.queued", data: { jobId: job.id, websiteId: website.id } });

  return NextResponse.json({ jobId: job.id });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";
import { getSourceConfig } from "@/features/tenders/api/sourceConfigs";

export async function POST(req: NextRequest) {
  const { tenderType } = await req.json();
  if (!tenderType || typeof tenderType !== "string") {
    return NextResponse.json({ error: "tenderType is required" }, { status: 400 });
  }
  if (!getSourceConfig(tenderType)) {
    return NextResponse.json({ error: `Unknown tender source: ${tenderType}` }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ status: "queued", kind: "tender-source", label: tenderType, notify_on_completion: false })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: error?.message ?? "Failed to create job" }, { status: 500 });

  await inngest.send({
    name: "tenders/source.queued",
    data: { jobId: job.id, tenderType, keywords: [], countries: [] },
  });

  return NextResponse.json({ jobId: job.id });
}

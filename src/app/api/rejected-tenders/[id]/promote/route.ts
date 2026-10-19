import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

// POST /api/rejected-tenders/[id]/promote
// Promotes a rejected tender to the live tenders table and adds its source_url to the allowlist
// so future scrape runs won't reject it again. The rejected_tenders row is deleted afterward.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Fetch the rejected tender
  const { data: rejected, error: fetchErr } = await supabase
    .from("rejected_tenders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !rejected) {
    return NextResponse.json({ error: "Rejected tender not found" }, { status: 404 });
  }

  // Insert into tenders table — use available fields; closing_date is NOT NULL so fall back to
  // the far-future sentinel (same convention as tenderRow.ts's NO_DEADLINE_SENTINEL).
  const { error: insertErr } = await supabase.from("tenders").insert({
    title: rejected.title,
    description: null,
    closing_date: "9999-12-31",
    source_url: rejected.source_url ?? `recovered:${rejected.id}`,
    status: "open",
    tender_type: rejected.tender_type ?? "Recovered",
    format: "HTML",
    scraped_at: new Date().toISOString(),
    organization: rejected.organization ?? null,
    category: rejected.category ?? null,
    location: rejected.location ?? null,
    country: null,
    budget: null,
    currency: null,
    document_url: null,
    raw_content: null,
    job_id: rejected.job_id ?? null,
    matched_keywords: null,
    sectors: null,
    languages: null,
    eligibility: null,
    attachments: null,
  });

  if (insertErr) {
    // Unique constraint on source_url — tender may already exist
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "A tender with this source URL already exists in the tenders table." }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Add to allowlist (upsert — safe to call again if somehow already there)
  if (rejected.source_url) {
    const { error: allowlistErr } = await supabase.from("tender_allowlist").upsert(
      { source_url: rejected.source_url, original_reason: rejected.reason },
      { onConflict: "source_url", ignoreDuplicates: true }
    );
    if (allowlistErr) {
      // Non-fatal — tender was already promoted, just log it
      console.error("[promote] allowlist upsert failed:", allowlistErr.message);
    }
  }

  // Remove the rejected_tenders row now that it's been recovered
  await supabase.from("rejected_tenders").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}

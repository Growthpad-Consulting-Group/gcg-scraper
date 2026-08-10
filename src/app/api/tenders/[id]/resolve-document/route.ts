import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { resolveDocumentLink } from "@/features/tenders/api/firecrawlExtract";

/** Resolves a tender's real document/PDF link on first detail-page view, for sources whose
 * listing-page extraction only sees the notice URL (see firecrawlExtract.ts:resolveDocumentLink).
 * `document_checked_at` caches the attempt — success or not — so repeat views don't re-scrape. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: tender, error } = await supabase
    .from("tenders")
    .select("id, source_url, document_url, document_checked_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

  if (tender.document_checked_at || !tender.source_url) {
    return NextResponse.json({ document_url: tender.document_url, document_checked_at: tender.document_checked_at });
  }

  const resolved = await resolveDocumentLink(tender.source_url).catch(() => null);
  const documentUrl = resolved || tender.document_url;

  const { error: updateError } = await supabase
    .from("tenders")
    .update({ document_url: documentUrl, document_checked_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ document_url: documentUrl, document_checked_at: new Date().toISOString() });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { resolveDocumentLink, resolveAttachments } from "@/features/tenders/api/firecrawlExtract";

/** Resolves a tender's real document/PDF link — and, if the original extraction came up empty,
 * its attachments — on first detail-page view. Covers two distinct gaps: sources whose
 * listing-page extraction only sees the notice URL, not its attached files (resolveDocumentLink);
 * and listing pages with several tenders on one page where the model extracted this tender
 * correctly but missed or misattributed its attachments (resolveAttachments).
 *
 * document_checked_at and attachments_checked_at are separate flags, not one shared timestamp —
 * attachments resolution was added after document resolution already existed, so a tender whose
 * document had already been checked (under the old single-flag scheme) must still be eligible for
 * an attachments attempt; reusing one flag for both would permanently skip it. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: tender, error } = await supabase
    .from("tenders")
    .select("id, title, source_url, document_url, document_checked_at, attachments, attachments_checked_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

  const needsDocument = !tender.document_checked_at && !!tender.source_url;
  const needsAttachments = !tender.attachments_checked_at && !tender.attachments?.length && !!tender.source_url;

  if (!needsDocument && !needsAttachments) {
    return NextResponse.json({
      document_url: tender.document_url,
      document_checked_at: tender.document_checked_at,
      attachments: tender.attachments,
    });
  }

  const [resolved, attachments] = await Promise.all([
    needsDocument ? resolveDocumentLink(tender.source_url!).catch(() => null) : Promise.resolve(null),
    needsAttachments ? resolveAttachments(tender.source_url!, tender.title).catch(() => null) : Promise.resolve(null),
  ]);
  const documentUrl = resolved || tender.document_url;
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("tenders")
    .update({
      ...(needsDocument ? { document_url: documentUrl, document_checked_at: now } : {}),
      ...(needsAttachments ? { attachments_checked_at: now, ...(attachments ? { attachments } : {}) } : {}),
    })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    document_url: documentUrl,
    document_checked_at: needsDocument ? now : tender.document_checked_at,
    attachments: attachments ?? tender.attachments,
  });
}

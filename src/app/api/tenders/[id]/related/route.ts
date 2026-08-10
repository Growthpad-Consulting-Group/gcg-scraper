import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

const LIMIT = 5;

/** Other open tenders from the same organization, falling back to the same tender_type when the
 * organization isn't known (aggregator sources don't always extract it) — surfaced on the detail
 * page for context on what else the same issuer/source currently has open. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: tender, error } = await supabase.from("tenders").select("id, organization, tender_type").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

  let query = supabase
    .from("tenders")
    .select("id, title, closing_date, organization, tender_type, status")
    .eq("status", "open")
    .neq("id", id)
    .order("closing_date", { ascending: true })
    .limit(LIMIT);

  query = tender.organization ? query.eq("organization", tender.organization) : query.eq("tender_type", tender.tender_type);

  const { data: related, error: relatedError } = await query;
  if (relatedError) return NextResponse.json({ error: relatedError.message }, { status: 500 });

  return NextResponse.json({ tenders: related || [] });
}

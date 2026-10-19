import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data: tender, error } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  return NextResponse.json({ tender });
}

const PURSUIT_STATUSES = new Set(["watching", "applied", "won", "lost", "passed"]);

/** Only the pursuit-tracking fields are editable here (status/owner/notes/bid data) — every
 * other field on a tender comes from the scrape pipeline and isn't meant to be hand-edited. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, string | number | null> = {};
  if ("pursuit_status" in body) {
    const value = body.pursuit_status;
    if (value !== null && !PURSUIT_STATUSES.has(value)) {
      return NextResponse.json({ error: `pursuit_status must be one of: ${[...PURSUIT_STATUSES].join(", ")}, or null` }, { status: 400 });
    }
    updates.pursuit_status = value;
  }
  if ("assigned_to" in body) updates.assigned_to = body.assigned_to?.trim() || null;
  if ("pursuit_notes" in body) updates.pursuit_notes = body.pursuit_notes?.trim() || null;
  if ("bid_submitted_at" in body) {
    const v = body.bid_submitted_at;
    updates.bid_submitted_at = v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  }
  if ("bid_value" in body) {
    const v = Number(body.bid_value);
    updates.bid_value = body.bid_value === null || body.bid_value === "" ? null : (Number.isFinite(v) && v > 0 ? v : null);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: tender, error } = await supabase.from("tenders").update(updates).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });
  return NextResponse.json({ tender });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("tenders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

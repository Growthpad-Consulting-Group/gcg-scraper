import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const payload: Record<string, unknown> = {};
  if ("lead_status" in body) payload.lead_status = body.lead_status ?? null;
  if ("lead_notes" in body) payload.lead_notes = body.lead_notes ?? null;
  if (!Object.keys(payload).length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("leads").update(payload).eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

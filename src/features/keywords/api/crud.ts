import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

// Shared CRUD logic for the four simple keyword tables (base_keywords, search_terms,
// relevant_keywords, closing_keywords), which all share the same {id, <key>, created_at}
// shape. `key` is the column holding the keyword/term text ("keyword" or "term").

export async function listKeywords(table: string, key: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from(table).select(`id, ${key}, created_at`).order(key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function createKeyword(req: NextRequest, table: string, key: string) {
  const body = await req.json();
  const value = body[key];
  if (!value) return NextResponse.json({ error: `${key} is required` }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .insert({ [key]: value })
    .select(`id, ${key}, created_at`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keyword: data });
}

export async function bulkDeleteKeywords(req: NextRequest, table: string) {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function updateKeyword(req: NextRequest, table: string, key: string, id: string) {
  const body = await req.json();
  const value = body[key];
  if (!value) return NextResponse.json({ error: `${key} is required` }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from(table).update({ [key]: value }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function deleteKeyword(table: string, id: string) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

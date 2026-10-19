import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data ?? null });
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const payload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if ("slack_enabled" in body) payload.slack_enabled = Boolean(body.slack_enabled);
  if ("email_enabled" in body) payload.email_enabled = Boolean(body.email_enabled);
  if ("tender_types" in body) {
    const types = body.tender_types;
    payload.tender_types = Array.isArray(types) && types.length > 0 ? types.map(String) : null;
  }
  if ("keywords" in body) {
    const kw = body.keywords;
    payload.keywords = Array.isArray(kw) && kw.length > 0 ? kw.map(String) : null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data });
}

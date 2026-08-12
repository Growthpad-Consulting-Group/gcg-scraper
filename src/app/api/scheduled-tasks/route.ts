import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: tasks, error } = await supabase.from("scheduled_tasks").select("*").order("task_id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    frequency,
    tender_type = body.tenderType,
    priority,
    search_terms,
    countries,
    linkedin_search_phrases,
    email_notifications_enabled,
    sms_notifications_enabled,
    slack_notifications_enabled,
    custom_emails,
    run_time,
  } = body;

  if (!name || !frequency) {
    return NextResponse.json({ error: "name and frequency are required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scheduled_tasks")
    .insert({
      user_id: user.email,
      name,
      frequency,
      tender_type,
      priority,
      search_terms: search_terms || [],
      countries: countries || [],
      linkedin_search_phrases: linkedin_search_phrases || [],
      engines: [],
      is_enabled: true,
      email_notifications_enabled: !!email_notifications_enabled,
      sms_notifications_enabled: !!sms_notifications_enabled,
      slack_notifications_enabled: !!slack_notifications_enabled,
      custom_emails: custom_emails || "",
      run_time: run_time || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ msg: "Task added successfully.", task: data });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: task, error: fetchError } = await supabase.from("scheduled_tasks").select("is_enabled").eq("task_id", id).maybeSingle();
  if (fetchError || !task) return NextResponse.json({ error: fetchError?.message || "Task not found" }, { status: 404 });

  const { error } = await supabase.from("scheduled_tasks").update({ is_enabled: !task.is_enabled }).eq("task_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ msg: "Task status updated." });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    name,
    tender_type,
    frequency,
    priority,
    search_terms,
    countries,
    email_notifications_enabled,
    sms_notifications_enabled,
    slack_notifications_enabled,
    custom_emails,
  } = body;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scheduled_tasks")
    .update({
      name,
      tender_type,
      frequency,
      priority,
      search_terms,
      countries,
      email_notifications_enabled,
      sms_notifications_enabled,
      slack_notifications_enabled,
      custom_emails,
    })
    .eq("task_id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ msg: "Task edited successfully.", task: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("scheduled_tasks").delete().eq("task_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ msg: "Task deleted successfully." });
}

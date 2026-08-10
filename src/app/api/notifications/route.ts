import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, message, read, created_at, job_id")
    .eq("user_id", user.email)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications });
}

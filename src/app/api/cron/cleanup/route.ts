import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getAppSettings } from "@/shared/lib/appSettings";

// Retention windows — tenders, scrape_jobs, and notifications all grew forever with nothing to
// prune them. Meant to be hit by an external cron (e.g. cron-job.org) since Inngest cron only
// fires from this same deployment and this is intentionally decoupled from it.
// Values now come from app_settings (Settings page) with these as the fallback defaults — see
// shared/lib/appSettings.ts.

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
  return provided === secret;
}

async function runCleanup() {
  const supabase = createServerSupabaseClient();
  const settings = await getAppSettings(supabase);

  const closedTenderCutoff = new Date(Date.now() - settings.closed_tender_retention_days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { error: tendersError, count: tendersDeleted } = await supabase
    .from("tenders")
    .delete({ count: "exact" })
    .eq("status", "closed")
    .lt("closing_date", closedTenderCutoff);
  if (tendersError) throw tendersError;

  const jobCutoff = new Date(Date.now() - settings.finished_job_retention_days * 24 * 60 * 60 * 1000).toISOString();
  const { error: jobsError, count: jobsDeleted } = await supabase
    .from("scrape_jobs")
    .delete({ count: "exact" })
    .in("status", ["done", "error", "canceled"])
    .lt("finished_at", jobCutoff);
  if (jobsError) throw jobsError;

  // Only read notifications — an unread one shouldn't silently vanish before the user's ever
  // seen it, no matter how old it gets.
  const notificationCutoff = new Date(Date.now() - settings.read_notification_retention_days * 24 * 60 * 60 * 1000).toISOString();
  const { error: notificationsError, count: notificationsDeleted } = await supabase
    .from("notifications")
    .delete({ count: "exact" })
    .eq("read", true)
    .lt("created_at", notificationCutoff);
  if (notificationsError) throw notificationsError;

  const rejectedTenderCutoff = new Date(Date.now() - settings.rejected_tender_retention_days * 24 * 60 * 60 * 1000).toISOString();
  const { error: rejectedError, count: rejectedDeleted } = await supabase
    .from("rejected_tenders")
    .delete({ count: "exact" })
    .lt("rejected_at", rejectedTenderCutoff);
  if (rejectedError) throw rejectedError;

  return {
    tendersDeleted: tendersDeleted ?? 0,
    jobsDeleted: jobsDeleted ?? 0,
    notificationsDeleted: notificationsDeleted ?? 0,
    rejectedTendersDeleted: rejectedDeleted ?? 0,
  };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await runCleanup();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

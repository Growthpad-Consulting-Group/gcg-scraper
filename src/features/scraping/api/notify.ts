import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/shared/lib/mailer";
import { sendSlackMessage } from "@/shared/lib/slack";
import type { InsertedTenderSummary } from "@/features/tenders/api/tenderRow";

const NO_DEADLINE_SENTINEL = "9999-12-31";
const LIST_THRESHOLD = 3; // show titles inline up to this many; beyond it, just the count

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatClosingDate(closingDate: string): string {
  if (closingDate === NO_DEADLINE_SENTINEL) return "no deadline listed";
  const parsed = new Date(closingDate);
  if (isNaN(parsed.getTime())) return `closes ${closingDate}`;
  return `closes ${ordinal(parsed.getUTCDate())} ${MONTH_NAMES[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/**
 * Notifications were previously pure UI — nothing ever inserted a row, and the
 * email/SMS/Slack toggles on a task did nothing. Called from each scrape flow's mark-done step;
 * only fires for scheduled (task-linked) runs, since ad-hoc Run Query users are already watching
 * the live console and don't need a notification for their own action. Email/Slack failures are
 * logged, not thrown — a bad SMTP/webhook config shouldn't fail the scrape job itself.
 */
export async function notifyTaskOwner(
  supabase: SupabaseClient,
  jobId: string,
  tendersFound: number,
  tenders: InsertedTenderSummary[] = []
): Promise<void> {
  if (tendersFound <= 0) return;

  const { data: job } = await supabase.from("scrape_jobs").select("task_id, label").eq("id", jobId).maybeSingle();
  if (!job?.task_id) return;

  const { data: task } = await supabase
    .from("scheduled_tasks")
    .select("user_id, name, email_notifications_enabled, slack_notifications_enabled, custom_emails")
    .eq("task_id", job.task_id)
    .maybeSingle();
  if (!task?.user_id) return;

  const label = task.name || job.label || "Scheduled task";
  const message = `"${label}" found ${tendersFound} new tender${tendersFound === 1 ? "" : "s"}.`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await supabase.from("notifications").insert({ user_id: task.user_id, message, read: false });

  // Enough to be worth listing inline vs. just pointing at the app — past a handful, a list
  // is noise, not signal.
  const showList = tendersFound <= LIST_THRESHOLD && tenders.length > 0;

  if (task.email_notifications_enabled) {
    const extraEmails = (task.custom_emails || "")
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean);
    const recipients = [task.user_id, ...extraEmails];
    try {
      const listHtml = showList
        ? `<ul>${tenders.map((t) => `<li>${t.title} — ${formatClosingDate(t.closing_date)}</li>`).join("")}</ul>`
        : "";
      await sendEmail({
        to: recipients,
        subject: `${tendersFound} new tender${tendersFound === 1 ? "" : "s"} found — ${label}`,
        html: `<p>${message}</p>${listHtml}<p><a href="${appUrl}/tenders">View tenders</a></p>`,
      });
    } catch (err) {
      console.error("Failed to send tender-found email:", err);
    }
  }

  if (task.slack_notifications_enabled) {
    try {
      const listText = showList ? "\n" + tenders.map((t) => `• ${t.title} — ${formatClosingDate(t.closing_date)}`).join("\n") : "";
      await sendSlackMessage(`${message}${listText}\n<${appUrl}/tenders|View tenders>`);
    } catch (err) {
      console.error("Failed to send tender-found Slack message:", err);
    }
  }
}

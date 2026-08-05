import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/shared/lib/mailer";
import { sendSlackMessage } from "@/shared/lib/slack";

/**
 * Notifications were previously pure UI — nothing ever inserted a row, and the
 * email/SMS/Slack toggles on a task did nothing. Called from each scrape flow's mark-done step;
 * only fires for scheduled (task-linked) runs, since ad-hoc Run Query users are already watching
 * the live console and don't need a notification for their own action. Email/Slack failures are
 * logged, not thrown — a bad SMTP/webhook config shouldn't fail the scrape job itself.
 */
export async function notifyTaskOwner(supabase: SupabaseClient, jobId: string, tendersFound: number): Promise<void> {
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

  await supabase.from("notifications").insert({ user_id: task.user_id, message, read: false });

  if (task.email_notifications_enabled) {
    const extraEmails = (task.custom_emails || "")
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean);
    const recipients = [task.user_id, ...extraEmails];
    try {
      await sendEmail({
        to: recipients,
        subject: `${tendersFound} new tender${tendersFound === 1 ? "" : "s"} found — ${label}`,
        html: `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tenders">View tenders</a></p>`,
      });
    } catch (err) {
      console.error("Failed to send tender-found email:", err);
    }
  }

  if (task.slack_notifications_enabled) {
    try {
      await sendSlackMessage(`:mega: ${message}`);
    } catch (err) {
      console.error("Failed to send tender-found Slack message:", err);
    }
  }
}

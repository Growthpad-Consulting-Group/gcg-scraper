import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/shared/lib/mailer";
import { sendSlackMessage } from "@/shared/lib/slack";
import type { InsertedTenderSummary } from "@/features/tenders/api/tenderRow";
import { tenderHref } from "@/shared/lib/slug";

const NO_DEADLINE_SENTINEL = "9999-12-31";
// Always list titles inline (a bare count on a 24-tender run told the reader nothing worth
// acting on), capped so a large batch run doesn't turn into a wall of text — the rest are a
// "+N more" trailer pointing at the app instead.
const LIST_LIMIT = 10;

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

/** "12 days left" — reads faster in a notification than the raw date alone, and mirrors the
 * urgency badge on the tender detail page. Only meaningful for open tenders with a real
 * deadline; whole-day granularity is enough here (unlike the detail page, nobody's deciding
 * whether to act in the next few hours from a Slack ping). */
export function daysLeftLabel(closingDate: string, status: "open" | "closed"): string | null {
  if (status !== "open" || closingDate === NO_DEADLINE_SENTINEL) return null;
  const deadline = new Date(closingDate);
  if (isNaN(deadline.getTime())) return null;
  const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  if (days === 0) return "closes today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
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
  // Sources with a public archive page (e.g. an NGO's multi-year RFP history) routinely turn up
  // long-closed tenders alongside real ones — a bare count reads as "24 things to act on" when
  // most weren't, so the open/closed split is surfaced right in the headline instead of buried
  // in result_summary.
  const openCount = tenders.filter((t) => t.status === "open").length;
  const closedCount = tenders.length - openCount;
  const statusBreakdown = tenders.length ? ` (${openCount} open, ${closedCount} closed)` : "";
  const message = `"${label}" found ${tendersFound} new tender${tendersFound === 1 ? "" : "s"}${statusBreakdown}.`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // job_id lets the in-app notification link straight to this run's results via the Tenders
  // page's existing `?job=` filter, instead of a message with nothing to click through to.
  await supabase.from("notifications").insert({ user_id: task.user_id, message, read: false, job_id: jobId });

  // Open tenders first — the ones actually worth acting on shouldn't get pushed off the visible
  // list by a source's closed-tender archive just because those happened to extract first.
  const sortedTenders = [...tenders].sort((a, b) => (a.status === "open" ? -1 : 0) - (b.status === "open" ? -1 : 0));
  const listedTenders = sortedTenders.slice(0, LIST_LIMIT);
  const remainingCount = tendersFound - listedTenders.length;

  // "[Category] Organization · Location" — each piece included only when known, since
  // extraction doesn't always find all three and a blank/lone separator reads worse than
  // just omitting what's missing.
  const meta = (t: InsertedTenderSummary) => {
    const orgLocation = [t.organization, t.location].filter(Boolean).join(" · ");
    return [t.category ? `[${t.category}]` : null, orgLocation || null].filter(Boolean).join(" ");
  };
  // "closes 5th June 2026 (12 days left)" — falls back to just the date when there's no
  // deadline or the tender's already closed (daysLeftLabel returns null in both cases).
  const closingWithUrgency = (t: InsertedTenderSummary) => {
    const urgency = daysLeftLabel(t.closing_date, t.status);
    return urgency ? `${formatClosingDate(t.closing_date)} (${urgency})` : formatClosingDate(t.closing_date);
  };

  if (task.email_notifications_enabled) {
    const extraEmails = (task.custom_emails || "")
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean);
    const recipients = [task.user_id, ...extraEmails];
    try {
      const listHtml = listedTenders.length
        ? `<ul>${listedTenders
            .map((t) => {
              const detail = meta(t);
              return `<li><a href="${appUrl}${tenderHref(t)}">${t.title}</a>${detail ? ` — ${detail}` : ""} — ${closingWithUrgency(t)}</li>`;
            })
            .join("")}${remainingCount > 0 ? `<li>...and ${remainingCount} more</li>` : ""}</ul>`
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
      const listText = listedTenders.length
        ? "\n" +
          listedTenders
            .map((t) => {
              const detail = meta(t);
              return `• <${appUrl}${tenderHref(t)}|${t.title}>${detail ? ` — ${detail}` : ""} — ${closingWithUrgency(t)}`;
            })
            .join("\n") +
          (remainingCount > 0 ? `\n...and ${remainingCount} more` : "")
        : "";
      await sendSlackMessage(`${message}${listText}\n<${appUrl}/tenders|View tenders>`);
    } catch (err) {
      console.error("Failed to send tender-found Slack message:", err);
    }
  }
}

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
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "18 Aug 2026" — the Slack card's compact date form, vs formatClosingDate's longer "18th
 * August 2026" prose form used in the summary line and email. */
function formatShortDate(closingDate: string): string {
  if (closingDate === NO_DEADLINE_SENTINEL) return "no deadline listed";
  const parsed = new Date(closingDate);
  if (isNaN(parsed.getTime())) return closingDate;
  return `${parsed.getUTCDate()} ${MONTH_NAMES_SHORT[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

export function formatClosingDate(closingDate: string): string {
  if (closingDate === NO_DEADLINE_SENTINEL) return "no deadline listed";
  const parsed = new Date(closingDate);
  if (isNaN(parsed.getTime())) return `closes ${closingDate}`;
  return `closes ${ordinal(parsed.getUTCDate())} ${MONTH_NAMES[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/** Raw day count until closing — null when there's no meaningful deadline (closed, or no
 * deadline stated) or it's already passed. Shared by daysLeftLabel (display text) and the Slack
 * card's urgency marker (🔴 vs ⏰), so both agree on what "urgent" means. */
function daysUntilClosing(closingDate: string, status: "open" | "closed"): number | null {
  if (status !== "open" || closingDate === NO_DEADLINE_SENTINEL) return null;
  const deadline = new Date(closingDate);
  if (isNaN(deadline.getTime())) return null;
  const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days < 0 ? null : days;
}

/** "12 days left" — reads faster in a notification than the raw date alone, and mirrors the
 * urgency badge on the tender detail page. Only meaningful for open tenders with a real
 * deadline; whole-day granularity is enough here (unlike the detail page, nobody's deciding
 * whether to act in the next few hours from a Slack ping). */
export function daysLeftLabel(closingDate: string, status: "open" | "closed"): string | null {
  const days = daysUntilClosing(closingDate, status);
  if (days === null) return null;
  if (days === 0) return "closes today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

// Days-left threshold for the Slack card's 🔴 urgent marker vs the default ⏰ — matches the
// Tenders page's "closing soon" badge threshold (7 days), so the same tender reads as urgent
// consistently across the app.
const URGENT_DAYS_THRESHOLD = 7;

export type TenderCardFields = {
  title: string;
  category?: string | null;
  organization?: string | null;
  location?: string | null;
  closing_date: string;
  status: "open" | "closed";
};

/** Shared card format for every Slack tender notification (new-tender alerts here, and the
 * separate closing-soon reminder job) — pulled out to one place after the two drifted out of
 * sync once before. 🔴 replaces the default ⏰ once a deadline is within URGENT_DAYS_THRESHOLD,
 * so an urgent one doesn't blend in with the rest at a glance. */
export function buildTenderSlackCard(t: TenderCardFields & { id: number | string }, appUrl: string): string {
  const days = daysUntilClosing(t.closing_date, t.status);
  const urgencyLabel = days === null ? null : days === 0 ? "closes today" : days === 1 ? "1 day left" : `${days} days left`;
  const marker = days !== null && days <= URGENT_DAYS_THRESHOLD ? "🔴" : "⏰";
  const dateStr = formatShortDate(t.closing_date);
  // "closes today" already says everything the date would — showing both reads as redundant
  // ("Closes: 12 Aug 2026 · closes today"), so the date drops out for that one case.
  const closingLine = days === 0 ? "closes today" : urgencyLabel ? `${dateStr} · ${urgencyLabel}` : dateStr;

  return [
    `<${appUrl}${tenderHref(t)}|${t.title}>`,
    t.category ? `🏷️ ${t.category}` : null,
    t.organization ? `🏢 ${t.organization}` : null,
    t.location ? `📍 ${t.location}` : null,
    `${marker} Closes: ${closingLine}`,
  ]
    .filter(Boolean)
    .join("\n");
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

  // job_id lets the in-app notification link straight to this run's results via the Tenders
  // page's existing `?job=` filter, instead of a message with nothing to click through to.
  await supabase.from("notifications").insert({ user_id: task.user_id, message, read: false, job_id: jobId });

  // insertTenderRows already drops closed tenders before they ever reach here, so `tenders` is
  // always open — no status split needed.
  const listedTenders = tenders.slice(0, LIST_LIMIT);
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
      // No separate banner line — the message above ("found N tenders") already says this, a
      // second "TENDER NOTIFICATION" header directly under it was pure repetition.
      const cardsText = listedTenders.length
        ? "\n\n" + listedTenders.map((t) => buildTenderSlackCard(t, appUrl)).join("\n\n") + (remainingCount > 0 ? `\n\n...and ${remainingCount} more` : "")
        : "";
      await sendSlackMessage(`${message}${cardsText}\n\n<${appUrl}/tenders|View tenders>`);
    } catch (err) {
      console.error("Failed to send tender-found Slack message:", err);
    }
  }
}

import { inngest } from "@/features/scraping/api/inngest-client";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { sendSlackMessage } from "@/shared/lib/slack";
import { buildTenderSlackCard } from "@/features/scraping/api/notify";

// A tender is only ever announced once, when first found — nothing prompted anyone to check
// back before it closed. This catches open tenders closing within this window that haven't
// been reminded about yet, once a day, so a genuinely relevant tender doesn't quietly expire
// unnoticed after its initial notification scrolled off.
const REMINDER_WINDOW_DAYS = 3;

export const sendClosingRemindersJob = inngest.createFunction(
  { id: "send-closing-reminders", retries: 0, triggers: { cron: "0 6 * * *" } },
  async ({ step }) => {
    const supabase = createServerSupabaseClient();

    const cutoff = new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const tenders = await step.run("find-closing-soon", async () => {
      const { data, error } = await supabase
        .from("tenders")
        .select("id, title, category, organization, location, closing_date, status")
        .eq("status", "open")
        .is("reminder_sent_at", null)
        .gte("closing_date", today)
        .lte("closing_date", cutoff)
        .order("closing_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    });

    if (tenders.length === 0) return { reminded: 0 };

    await step.run("send-slack-reminder", async () => {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      // No separate "CLOSING SOON REMINDER" banner — the header line already says this.
      const header = `⏰ ${tenders.length} tender${tenders.length === 1 ? "" : "s"} closing within ${REMINDER_WINDOW_DAYS} days`;
      const cards = tenders.map((t) => buildTenderSlackCard(t, appUrl)).join("\n\n");
      await sendSlackMessage(`${header}\n\n${cards}\n\n<${appUrl}/tenders|View tenders>`);
    });

    await step.run("mark-reminded", async () => {
      const ids = tenders.map((t) => t.id);
      const { error } = await supabase.from("tenders").update({ reminder_sent_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    });

    return { reminded: tenders.length };
  }
);

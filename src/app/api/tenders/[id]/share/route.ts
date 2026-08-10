import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { sendEmail } from "@/shared/lib/mailer";
import { sendSlackMessage } from "@/shared/lib/slack";
import { formatClosingDate } from "@/features/scraping/api/notify";

/** Ad-hoc "send this one tender" action from the detail page — separate from
 * `notifyTaskOwner` (features/scraping/api/notify.ts), which only fires automatically for the
 * owner of the scheduled task that found a batch of tenders. This is for sharing a single
 * tender with someone outside that loop (a colleague without an account, a channel that isn't
 * the task owner's default), so it takes an explicit recipient instead of looking one up. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { channel, email } = body as { channel: "email" | "slack"; email?: string };

  if (channel !== "email" && channel !== "slack") {
    return NextResponse.json({ error: "channel must be 'email' or 'slack'" }, { status: 400 });
  }
  if (channel === "email" && !email?.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: tender, error } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const detailUrl = `${appUrl}/tenders/${tender.id}`;
  const closing = formatClosingDate(tender.closing_date);
  const meta = [tender.organization, tender.location, tender.category].filter(Boolean).join(" · ");

  try {
    if (channel === "email") {
      await sendEmail({
        to: email!.trim(),
        subject: `Tender: ${tender.title}`,
        html: `
          <p><strong>${tender.title}</strong></p>
          ${meta ? `<p>${meta}</p>` : ""}
          <p>${closing}</p>
          ${tender.description ? `<p>${tender.description}</p>` : ""}
          <p><a href="${detailUrl}">View tender</a>${tender.source_url ? ` · <a href="${tender.source_url}">Source</a>` : ""}</p>
        `,
      });
    } else {
      await sendSlackMessage(`*${tender.title}*${meta ? `\n${meta}` : ""}\n${closing}\n<${detailUrl}|View tender>`);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to send" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

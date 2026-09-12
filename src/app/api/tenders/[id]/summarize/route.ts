import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

// raw_content is a full scraped-page markdown dump, often tens of KB. For a single-tender detail
// page that's mostly nav/footer noise around the one relevant block; for a multi-tender listing
// page (e.g. DevelopmentAid's search results — dozens of unrelated tenders on one page, 40KB+)
// this tender's own content can start well past any fixed prefix length. Trimmed to a window
// centered on the tender's own title rather than blindly taking the first N chars, both to keep
// the prompt cheap and to avoid ever summarizing a neighboring tender's content by accident.
const WINDOW_CHARS = 5000;

/** Finds the window of raw_content most likely to be about this specific tender — centered on
 * the first occurrence of its title if found (handles multi-tender listing pages), otherwise
 * just the start of the page (single-tender detail pages, where the title may be styled/split
 * across markdown and not match verbatim). */
function extractRelevantWindow(rawContent: string, title: string): string {
  // A meaningful prefix of the title, not the whole thing — long titles often get truncated or
  // reformatted (quotes, dashes) in markdown, so matching the first ~40 chars is more robust than
  // requiring an exact full match.
  const needle = title.slice(0, 40).trim();
  const idx = needle.length > 10 ? rawContent.indexOf(needle) : -1;
  if (idx === -1) return rawContent.slice(0, WINDOW_CHARS);
  const start = Math.max(0, idx - 200);
  return rawContent.slice(start, start + WINDOW_CHARS);
}

/** Generates a short "Quick summary" for tenders whose extraction never captured a real
 * description (common on aggregator listing pages that only link out to the notice). Lazy, on
 * first detail-page view — same pattern as resolve-document's document_checked_at /
 * attachments_checked_at. `ai_summary_generated_at` caches the attempt, success or not, so
 * repeat views don't re-call the model. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: tender, error } = await supabase
    .from("tenders")
    .select("id, title, description, raw_content, ai_summary, ai_summary_generated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

  if (tender.description?.trim() || tender.ai_summary_generated_at) {
    return NextResponse.json({ ai_summary: tender.ai_summary, ai_summary_generated_at: tender.ai_summary_generated_at });
  }

  if (!tender.raw_content?.trim() || !process.env.GROQ_API_KEY) {
    // Still stamp the attempt — a tender with no raw content or no key configured will never
    // succeed, and re-checking on every view would just be a wasted round trip.
    const now = new Date().toISOString();
    await supabase.from("tenders").update({ ai_summary_generated_at: now }).eq("id", id);
    return NextResponse.json({ ai_summary: null, ai_summary_generated_at: now });
  }

  const content = extractRelevantWindow(tender.raw_content, tender.title);
  const summary = await generateSummary(tender.title, content).catch(() => null);
  const now = new Date().toISOString();

  await supabase
    .from("tenders")
    .update({ ai_summary: summary, ai_summary_generated_at: now })
    .eq("id", id);

  return NextResponse.json({ ai_summary: summary, ai_summary_generated_at: now });
}

async function generateSummary(title: string, content: string): Promise<string | null> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write a short, factual 'Quick summary' for a procurement tender listing, from raw scraped page content given. The content may be a snippet from a listing page showing several tenders — only summarize the one matching the exact title given, and ignore any other tender's block that appears before or after it in the snippet. 2-4 sentences, plain prose (no headers, no bullet points, no markdown). Cover what the tender is for and, if the page states it, who is eligible to bid. Only use facts present in the given content for that specific tender — never invent an organization, deadline, or eligibility detail, and never describe a different tender from the same snippet. If the content for that specific title is just metadata (funding agency, category, dates) with no actual descriptive text, or the title isn't found in the content at all, reply with exactly: NONE",
        },
        { role: "user", content: `Tender title: ${title}\n\nPage content:\n${content}` },
      ],
      temperature: 0.2,
      // gpt-oss-120b is a reasoning model — it spends part of max_tokens on a hidden `reasoning`
      // field before the visible `content`. Confirmed live: at max_tokens: 300 with the default
      // reasoning effort, it burned 240 tokens on reasoning alone and got cut off mid-sentence
      // (finish_reason: "length"). reasoning_effort: "low" keeps that to a handful of tokens for
      // a task this simple, and max_tokens is raised as a safety margin on top of that.
      reasoning_effort: "low",
      max_tokens: 500,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text || text === "NONE") return null;
  return text;
}

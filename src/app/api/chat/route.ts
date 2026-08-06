import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getUserForSessionToken, SESSION_COOKIE_NAME } from "@/features/auth/api/session";
import { CHAT_TOOLS, executeTool } from "@/features/chat/api/tools";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Tried in order: the primary model is the strongest tool-caller Groq offers, but every model
// occasionally emits a malformed tool call — falling back to a second model (rather than just
// retrying the same one again) recovers cases where the first is stuck in a bad pattern for this
// specific conversation.
const MODELS = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"];
const MAX_TOOL_ROUNDS = 4;

const SYSTEM_PROMPT = `You are the in-app assistant for GCG Scraper, a tender/lead scraping tool. You answer questions about the team's own scraped data — tenders, leads, scrape runs, and scheduled tasks — using the tools provided. Never invent numbers or rows; only state what a tool call returned. If a tool returns zero results, say so plainly. Keep answers short and concrete — lead with the number/answer, then at most a few supporting details. Use markdown lists/tables only when they genuinely help. If a question isn't about this app's data, say you can only help with tenders, leads, runs, and schedules here.

IMPORTANT: tool results already in this conversation contain full row data (including fields like closing_date, status, category, etc.) — if a follow-up question can be answered from a row you already fetched, answer directly from that data. Do NOT call a tool again just to re-fetch information you already have.

You can also give strategy advice — what search terms/keywords to try next, which tracked websites are stale and worth re-scraping, what tender categories or locations seem underexplored. When asked for this kind of advice, ALWAYS call list_search_inputs and/or list_website_sources (and query_tenders/query_leads to see what's been productive) first, and ground every suggestion in what those calls actually returned — e.g. "you're already tracking 3 construction-tender sites but none in the last 30 days, worth a re-scrape" or "your search terms don't cover 'consultancy' yet, and it shows up often in tender categories you've already found." Never suggest a keyword, site, or category you have no evidence for from the data.`;

type ChatMessage = { role: "user" | "assistant" | "system" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: any[] };

const MAX_TOOL_RETRIES_PER_ROUND = 2;

/** Groq/Llama occasionally emits a malformed `<function=...>` text tag instead of a proper
 * structured tool call (a known upstream quirk, more common on short/context-dependent
 * follow-ups). It's non-deterministic — a retry with the same input almost always succeeds —
 * so we retry a couple of times before surfacing anything to the user. */
async function callGroq(conversation: ChatMessage[], model: string): Promise<{ choice: any } | { retryable: true } | { error: string }> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: conversation,
      tools: CHAT_TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 400 && errText.includes("tool_use_failed")) return { retryable: true };
    return { error: `Groq request failed: ${res.status} ${errText}` };
  }

  const data = await res.json();
  const choice = data?.choices?.[0]?.message;
  if (!choice) return { error: "No response from model." };
  return { choice };
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await getUserForSessionToken(token) : null;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const conversation: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-20)];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      let result: Awaited<ReturnType<typeof callGroq>> | undefined;
      outer: for (const model of MODELS) {
        for (let attempt = 0; attempt <= MAX_TOOL_RETRIES_PER_ROUND; attempt++) {
          result = await callGroq(conversation, model);
          if (!("retryable" in result)) break outer;
        }
      }
      if (!result || "retryable" in result) {
        return NextResponse.json({ message: "I had trouble putting that lookup together — could you rephrase the question?" });
      }
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }

      const choice = result.choice;
      const toolCalls = choice.tool_calls as { id: string; function: { name: string; arguments: string } }[] | undefined;

      if (!toolCalls || toolCalls.length === 0) {
        return NextResponse.json({ message: choice.content ?? "" });
      }

      conversation.push({ role: "assistant", content: choice.content ?? null, tool_calls: toolCalls });

      for (const call of toolCalls) {
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          // leave args empty if the model sent malformed JSON
        }
        const toolResult = await executeTool(supabase, call.function.name, args);
        conversation.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(toolResult) });
      }
    }

    return NextResponse.json({ message: "I wasn't able to finish looking that up — try narrowing the question." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Chat request failed." }, { status: 500 });
  }
}

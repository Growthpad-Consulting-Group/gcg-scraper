import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";
import type { ExtractOptions } from "@/features/tenders/api/firecrawlExtract";

function clampNumber(value: unknown, min: number, max: number): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.max(n, min), max) : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 20);
  return cleaned.length > 0 ? cleaned : undefined;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const body = await req.json().catch(() => ({}));
  const rawOptions = body?.extractOptions ?? {};
  const extractOptions: ExtractOptions = {
    onlyMainContent: typeof rawOptions.onlyMainContent === "boolean" ? rawOptions.onlyMainContent : true,
    waitFor: clampNumber(rawOptions.waitFor, 0, 30_000),
    timeout: clampNumber(rawOptions.timeout, 1_000, 120_000),
    maxAge: clampNumber(rawOptions.maxAge, 0, 1000 * 60 * 60 * 24 * 30),
    excludeTags: stringArray(rawOptions.excludeTags),
    includeTags: stringArray(rawOptions.includeTags),
  };

  const { data: website, error: fetchError } = await supabase.from("websites").select("id, name").eq("id", id).maybeSingle();
  if (fetchError || !website) return NextResponse.json({ error: fetchError?.message || "Website not found" }, { status: 404 });

  // No `keywords` here — this ad-hoc path has none of its own, and run-website-scrape.ts
  // already falls back to the curated global search_terms list (used as both the LLM prompt
  // hint and the deterministic backstop filter) when keywords isn't set.
  const countries = stringArray(body?.countries);

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ status: "queued", kind: "tender-website", label: website.name || `Website #${website.id}` })
    .select("id")
    .single();
  if (error || !job) return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 });

  await inngest.send({ name: "tenders/website.queued", data: { jobId: job.id, websiteId: website.id, extractOptions, countries } });

  return NextResponse.json({ jobId: job.id });
}

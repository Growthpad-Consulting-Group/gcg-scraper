import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: websites, error } = await supabase.from("websites").select("*").order("id", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ websites: websites ?? [] });
}

export async function POST(req: NextRequest) {
  const { name, url, location } = await req.json();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(url).toString();
  } catch {
    return NextResponse.json({ error: "url must be a valid, absolute URL (e.g. https://example.com)" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Re-adding a URL that's already tracked should reuse that row instead of creating a
  // duplicate — otherwise re-running the same site through Run Query's Website mode silently
  // piles up copies in the sources list.
  const { data: existing, error: lookupError } = await supabase.from("websites").select("*").eq("url", normalizedUrl).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (existing) return NextResponse.json({ website: existing, reused: true });

  const { data: website, error } = await supabase
    .from("websites")
    .insert({
      name: name?.trim() || new URL(normalizedUrl).hostname,
      url: normalizedUrl,
      location: location?.trim() || null,
      tender_type: "Uploaded Websites",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ website });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("blocked_domains")
    .select("id, domain, reason, created_at")
    .order("domain", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blockedDomains: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const domain = (body?.domain ?? "").trim().toLowerCase()
    .replace(/^https?:\/\//, "")   // strip protocol if pasted with it
    .replace(/\/.*$/, "")          // strip path
    .replace(/^www\./, "");        // normalise www prefix

  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  // Basic sanity check — must look like a domain (contains at least one dot)
  if (!domain.includes(".")) {
    return NextResponse.json({ error: "Invalid domain — must be a hostname like example.com" }, { status: 400 });
  }

  const reason = (body?.reason ?? "").trim() || null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("blocked_domains")
    .insert({ domain, reason })
    .select("id, domain, reason, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: `${domain} is already blocked` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blockedDomain: data }, { status: 201 });
}

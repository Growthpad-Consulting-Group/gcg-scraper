import type { SupabaseClient } from "@supabase/supabase-js";

/** Tool schemas handed to Groq — each maps 1:1 to a read-only, parameterized query below.
 * The model never writes SQL itself, so there's no injection surface and no way for it to
 * touch data outside these shapes. */
export const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_tenders",
      description: "Search/count scraped tenders. Use for any question about tenders, RFPs, RFQs, or procurement opportunities.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "closed"], description: "Filter by tender status." },
          tender_type: { type: "string", description: "e.g. 'Search Query Tenders', 'Website Tenders', 'Uploaded Websites'." },
          organization: { type: "string", description: "Partial match on issuing organization name." },
          category: { type: "string", description: "Partial match on category, e.g. 'IT', 'Construction'." },
          location: { type: "string", description: "Partial match on location/country/city." },
          closing_within_days: { type: "number", description: "Only tenders closing within this many days from now." },
          since: { type: "string", description: "ISO date — only tenders scraped on/after this date." },
          until: { type: "string", description: "ISO date — only tenders scraped on/before this date." },
          limit: { type: "number", description: "Max rows to return, default 10, max 25." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Search/count scraped business (Google Maps) or people (LinkedIn) leads.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", enum: ["gmb", "linkedin"], description: "Which lead source to query. Required." },
          category: { type: "string", description: "GMB only — partial match on business category." },
          location: { type: "string", description: "Partial match on location." },
          search_query: { type: "string", description: "Partial match on the search query that found this lead." },
          since: { type: "string", description: "ISO date — only leads found on/after this date." },
          until: { type: "string", description: "ISO date — only leads found on/before this date." },
          limit: { type: "number", description: "Max rows to return, default 10, max 25." },
        },
        required: ["source"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_runs",
      description: "Look up recent scrape/search runs (jobs) — status, kind, when they ran, what they found.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["queued", "running", "done", "error", "canceled"] },
          kind: { type: "string", enum: ["search-query", "tender-source", "tender-website", "gmb-leads", "linkedin-leads"] },
          limit: { type: "number", description: "Max rows to return, default 10, max 25." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_scheduled_tasks",
      description: "List scheduled/recurring scrape tasks — their frequency, when they last ran, whether they're enabled.",
      parameters: {
        type: "object",
        properties: {
          enabled_only: { type: "boolean", description: "If true, only return currently-enabled schedules." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_search_inputs",
      description:
        "List the search terms and base keywords currently configured for Search Query runs. Use this before suggesting new keywords/terms, so you can see what's already covered and point out real gaps instead of guessing.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_website_sources",
      description:
        "List tracked website sources (added via Run Query's Website mode), ordered by least-recently-scraped first. Use this to suggest which existing sources are stale and worth re-scraping, or to see what kinds of sites are already tracked before suggesting new ones.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max rows to return, default 15, max 30." },
        },
      },
    },
  },
] as const;

const clampLimit = (limit: unknown, fallback = 10, max = 25) => {
  const n = Number(limit);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
};

async function queryTenders(supabase: SupabaseClient, args: Record<string, any>) {
  const limit = clampLimit(args.limit);
  let request = supabase
    .from("tenders")
    .select("id, title, status, organization, category, location, closing_date, scraped_at, tender_type", { count: "exact" })
    .order("scraped_at", { ascending: false })
    .limit(limit);

  if (args.status) request = request.eq("status", args.status);
  if (args.tender_type) request = request.eq("tender_type", args.tender_type);
  if (args.organization) request = request.ilike("organization", `%${args.organization}%`);
  if (args.category) request = request.ilike("category", `%${args.category}%`);
  if (args.location) request = request.ilike("location", `%${args.location}%`);
  if (args.since) request = request.gte("scraped_at", args.since);
  if (args.until) request = request.lte("scraped_at", args.until);
  if (typeof args.closing_within_days === "number") {
    const cutoff = new Date(Date.now() + args.closing_within_days * 86_400_000).toISOString();
    request = request.gte("closing_date", new Date().toISOString()).lte("closing_date", cutoff);
  }

  const { data, error, count } = await request;
  if (error) return { error: error.message };
  return { count: count ?? data?.length ?? 0, tenders: data ?? [] };
}

async function queryLeads(supabase: SupabaseClient, args: Record<string, any>) {
  const limit = clampLimit(args.limit);
  const table = args.source === "linkedin" ? "linkedin_leads" : "leads";
  const columns =
    args.source === "linkedin"
      ? "id, full_name, headline, current_company, location, search_query, created_at"
      : "id, business_name, category, address, location, phone, rating, search_query, created_at";

  let request = supabase.from(table).select(columns, { count: "exact" }).order("created_at", { ascending: false }).limit(limit);

  if (args.location) request = request.ilike("location", `%${args.location}%`);
  if (args.search_query) request = request.ilike("search_query", `%${args.search_query}%`);
  if (args.source !== "linkedin" && args.category) request = request.ilike("category", `%${args.category}%`);
  if (args.since) request = request.gte("created_at", args.since);
  if (args.until) request = request.lte("created_at", args.until);

  const { data, error, count } = await request;
  if (error) return { error: error.message };
  return { count: count ?? data?.length ?? 0, leads: data ?? [] };
}

async function queryRuns(supabase: SupabaseClient, args: Record<string, any>) {
  const limit = clampLimit(args.limit);
  let request = supabase
    .from("scrape_jobs")
    .select("id, kind, label, status, result_summary, created_at, finished_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.status) request = request.eq("status", args.status);
  if (args.kind) request = request.eq("kind", args.kind);

  const { data, error } = await request;
  if (error) return { error: error.message };
  return { jobs: data ?? [] };
}

async function queryScheduledTasks(supabase: SupabaseClient, args: Record<string, any>) {
  let request = supabase
    .from("scheduled_tasks")
    .select("task_id, name, frequency, tender_type, priority, is_enabled, last_run")
    .order("task_id");

  if (args.enabled_only) request = request.eq("is_enabled", true);

  const { data, error } = await request;
  if (error) return { error: error.message };
  return { tasks: data ?? [] };
}

async function listSearchInputs(supabase: SupabaseClient) {
  const [{ data: terms, error: termsError }, { data: keywords, error: keywordsError }] = await Promise.all([
    supabase.from("search_terms").select("term").order("term"),
    supabase.from("base_keywords").select("keyword").order("keyword"),
  ]);
  if (termsError) return { error: termsError.message };
  if (keywordsError) return { error: keywordsError.message };
  return {
    search_terms: (terms ?? []).map((t) => t.term),
    base_keywords: (keywords ?? []).map((k) => k.keyword),
  };
}

async function listWebsiteSources(supabase: SupabaseClient, args: Record<string, any>) {
  const limit = clampLimit(args.limit, 15, 30);
  const { data, error } = await supabase
    .from("websites")
    .select("id, name, url, location, last_scraped_at")
    .order("last_scraped_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) return { error: error.message };
  return { websites: data ?? [] };
}

export async function executeTool(supabase: SupabaseClient, name: string, args: Record<string, any>): Promise<unknown> {
  switch (name) {
    case "query_tenders":
      return queryTenders(supabase, args);
    case "query_leads":
      return queryLeads(supabase, args);
    case "query_runs":
      return queryRuns(supabase, args);
    case "query_scheduled_tasks":
      return queryScheduledTasks(supabase, args);
    case "list_search_inputs":
      return listSearchInputs(supabase);
    case "list_website_sources":
      return listWebsiteSources(supabase, args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

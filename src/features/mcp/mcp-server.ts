import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

const TENDER_LIST_COLUMNS =
  "id,title,description,closing_date,source_url,status,scraped_at,format,tender_type,budget,currency,location,country,organization,category,document_url,job_id,created_at,updated_at";

// Builds a fresh McpServer with all tools registered. Called once per request (serverless-safe —
// nothing here persists across invocations, tools just read from Supabase each time).
export function createMcpServer() {
  const server = new McpServer({ name: "gcg-scraper", version: "0.1.0" });
  const supabase = createServerSupabaseClient();

  server.registerTool(
    "search_tenders",
    {
      title: "Search tenders",
      description:
        "Search scraped tenders by keyword (matches title/description) and optionally filter by scrape job id. Returns up to `limit` most recently scraped tenders.",
      inputSchema: {
        query: z.string().trim().optional().describe("Keyword to search in title/description"),
        jobId: z.string().trim().optional().describe("Filter to a specific scrape job id"),
        limit: z.number().int().positive().max(200).default(50),
      },
    },
    async ({ query, jobId, limit }) => {
      let request = supabase
        .from("tenders")
        .select(TENDER_LIST_COLUMNS, { count: "exact" })
        .order("scraped_at", { ascending: false })
        .limit(limit);
      if (query) request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      if (jobId) request = request.eq("job_id", jobId);

      const { data, error, count } = await request;
      if (error) return errorResult(error.message);
      return textResult({ tenders: data, total: count ?? data?.length ?? 0 });
    }
  );

  server.registerTool(
    "get_tender",
    {
      title: "Get tender by id",
      description: "Fetch full details (including raw scraped content) for a single tender by its id.",
      inputSchema: { id: z.string().describe("Tender id") },
    },
    async ({ id }) => {
      const { data, error } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult(`Tender ${id} not found`);
      return textResult({ tender: data });
    }
  );

  server.registerTool(
    "search_leads",
    {
      title: "Search business leads",
      description:
        "Search scraped business leads by keyword (matches business name/category/address) and optionally filter by scrape job id.",
      inputSchema: {
        query: z.string().trim().optional(),
        jobId: z.string().trim().optional(),
        limit: z.number().int().positive().max(500).default(100),
      },
    },
    async ({ query, jobId, limit }) => {
      let request = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);
      if (query) request = request.or(`business_name.ilike.%${query}%,category.ilike.%${query}%,address.ilike.%${query}%`);
      if (jobId) request = request.eq("job_id", jobId);

      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return textResult({ leads: data });
    }
  );

  server.registerTool(
    "search_linkedin_leads",
    {
      title: "Search LinkedIn leads",
      description:
        "Search scraped LinkedIn profile leads by keyword (matches name/headline/current company) and optionally filter by scrape job id.",
      inputSchema: {
        query: z.string().trim().optional(),
        jobId: z.string().trim().optional(),
        limit: z.number().int().positive().max(500).default(100),
      },
    },
    async ({ query, jobId, limit }) => {
      let request = supabase.from("linkedin_leads").select("*").order("created_at", { ascending: false }).limit(limit);
      if (query) request = request.or(`full_name.ilike.%${query}%,headline.ilike.%${query}%,current_company.ilike.%${query}%`);
      if (jobId) request = request.eq("job_id", jobId);

      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return textResult({ leads: data });
    }
  );

  server.registerTool(
    "list_scrape_jobs",
    {
      title: "List scrape jobs",
      description: "List recent scrape jobs (runs) with their status and progress, most recent first.",
      inputSchema: { limit: z.number().int().positive().max(100).default(30) },
    },
    async ({ limit }) => {
      const { data, error } = await supabase
        .from("scrape_jobs")
        .select("id, task_id, kind, label, status, progress, result_summary, created_at, finished_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return errorResult(error.message);
      return textResult({ jobs: data });
    }
  );

  return server;
}

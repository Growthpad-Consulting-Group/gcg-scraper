import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedTender } from "./firecrawlExtract";
import type { RejectionReason } from "./sourceConfigs";

/** Best-effort logging of a job's rejected candidates for the "why did this find 0 new tenders"
 * detail view — deliberately never throws, since a rejected-tender it can't log is far less
 * important than the actual scrape job succeeding. Called once per job with everything it
 * rejected, rather than per-item, to keep this a single insert. */
export async function logRejectedTenders(
  supabase: SupabaseClient,
  jobId: string,
  tenderType: string,
  rejected: { tender: Pick<ExtractedTender, "title" | "source_url" | "organization" | "category" | "location">; reason: RejectionReason }[]
): Promise<void> {
  if (rejected.length === 0) return;
  try {
    const rows = rejected.map(({ tender, reason }) => ({
      job_id: jobId,
      tender_type: tenderType,
      title: tender.title,
      source_url: tender.source_url || null,
      organization: tender.organization || null,
      category: tender.category || null,
      location: tender.location || null,
      reason,
    }));
    const { error } = await supabase.from("rejected_tenders").insert(rows);
    if (error) console.warn(`[rejectedTenders] failed to log ${rows.length} rejection(s) for job ${jobId}: ${error.message}`);
  } catch (err) {
    console.warn(`[rejectedTenders] failed to log rejections for job ${jobId}:`, err);
  }
}

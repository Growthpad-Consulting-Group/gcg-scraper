import type { SupabaseClient } from "@supabase/supabase-js";

// Cooperative cancellation: the cancel endpoint just flips scrape_jobs.status to "canceled"
// directly (no way to interrupt an in-flight Inngest step). Long-running jobs check this
// between steps and stop early instead of overwriting a user-requested cancel with "done".
export async function isJobCanceled(supabase: SupabaseClient, jobId: string): Promise<boolean> {
  const { data } = await supabase.from("scrape_jobs").select("status").eq("id", jobId).maybeSingle();
  return data?.status === "canceled";
}

import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { parseTenderIdFromSegment } from "@/shared/lib/slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ idSlug: string }>;
}): Promise<Metadata> {
  const { idSlug } = await params;
  const id = parseTenderIdFromSegment(idSlug);

  const supabase = createServerSupabaseClient();
  const { data: tender } = await supabase.from("tenders").select("title, description").eq("id", id).maybeSingle();

  if (!tender) return { title: "Tender not found" };

  return {
    title: tender.title,
    description: tender.description || undefined,
  };
}

export default function TenderDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}

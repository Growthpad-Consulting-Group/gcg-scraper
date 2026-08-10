import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { inngest } from "@/features/scraping/api/inngest-client";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword",                                                       // .doc
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "application/vnd.ms-excel",                                                 // .xls
  "text/html",
  "application/xhtml+xml",
  "text/csv",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — Firecrawl's hard limit

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart/form-data body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "A 'file' field is required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds the 50 MB limit" }, { status: 413 });
  }

  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Accepted: PDF, DOCX, XLSX, HTML, CSV` },
      { status: 415 }
    );
  }

  // Convert File → base64 so it can be passed through the Inngest event payload
  // (Inngest events are JSON; binary blobs must be serialised).
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const label = file.name || "Document";

  const { data: job, error } = await supabase
    .from("scrape_jobs")
    .insert({ status: "queued", kind: "document", label })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 });
  }

  await inngest.send({
    name: "tenders/document.queued",
    data: {
      jobId: job.id,
      fileName: file.name,
      mimeType: file.type,
      fileBase64: base64,
    },
  });

  return NextResponse.json({ jobId: job.id });
}

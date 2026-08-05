import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/shared/lib/mailer";

interface ExportHeader {
  label: string;
  key: string;
}

interface ExportEmailBody {
  data: Record<string, unknown>[];
  headers: ExportHeader[];
  recipients: string[];
  subject: string;
  message: string;
  filename?: string;
  format?: "csv" | "xlsx" | "pdf";
  user?: { name?: string; email?: string } | null;
}

/**
 * Minimal export-by-email endpoint. Reuses the existing nodemailer wrapper
 * (src/shared/lib/mailer.ts). It does not attach a generated CSV/XLSX/PDF
 * file — it renders the selected rows as an HTML table in the email body.
 * Wiring up real file attachments is a follow-up if this is used for large
 * exports.
 */
export async function POST(req: NextRequest) {
  try {
    const body: ExportEmailBody = await req.json();
    const { data, headers, recipients, subject, message } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: "No recipients provided" }, { status: 400 });
    }
    if (!headers || headers.length === 0) {
      return NextResponse.json({ error: "No fields selected" }, { status: 400 });
    }

    const rows = (data || [])
      .map(
        (row) =>
          `<tr>${headers
            .map((h) => `<td style="padding:4px 8px;border:1px solid #e5e7eb;">${escapeHtml(String(row[h.key] ?? ""))}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;">
        <p>${escapeHtml(message || "Please find your requested data export below.")}</p>
        <table style="border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>${headers.map((h) => `<th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left;background:#f9fafb;">${escapeHtml(h.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    await sendEmail({ to: recipients, subject: subject || "Data Export", html });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Export email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send export email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

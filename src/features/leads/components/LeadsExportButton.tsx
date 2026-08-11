"use client";

import { CSVLink } from "react-csv";
import { Icon } from "@iconify/react";

/** Tenders had `ExportModal`; leads had nothing. Straight CSV of the current list — no
 * field-picker modal, leads records are already flat and small enough not to need one. */
export default function LeadsExportButton({ leads, filename }: { leads: Record<string, unknown>[]; filename: string }) {
  const rows = leads.map(({ raw, job_id, contacts, ...rest }) => rest);

  if (leads.length === 0) return null;

  return (
    <CSVLink
      data={rows}
      filename={filename}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-app-border px-2.5 text-sm text-text-hi hover:border-text-lo"
    >
      <Icon icon="solar:export-broken" width={14} />
      Export CSV
    </CSVLink>
  );
}

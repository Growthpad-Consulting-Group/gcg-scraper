"use client";

import { Fragment, useState } from "react";
import { Icon } from "@iconify/react";
import Badge from "@/shared/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/shared/ui/Table";
import LogPanel from "@/shared/ui/LogPanel";

export interface LeadColumn<T> {
  key: string;
  label: string;
  render: (lead: T) => React.ReactNode;
  mono?: boolean;
}

interface Lead {
  id: string | number;
  [key: string]: unknown;
}

export default function LeadsTableV2<T extends Lead>({
  leads,
  columns,
  onDelete,
  sourceBadge,
}: {
  leads: T[];
  columns: LeadColumn<T>[];
  onDelete: (id: string | number) => void;
  sourceBadge: string;
}) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (leads.length === 0) {
    return <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">No leads yet — run a search above.</div>;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableTh key={col.key}>{col.label}</TableTh>
          ))}
          <TableTh>Source</TableTh>
          <TableTh className="w-16" />
        </TableRow>
      </TableHead>
      <TableBody>
        {leads.map((lead) => {
          const expanded = expandedId === lead.id;
          return (
            <Fragment key={lead.id}>
              <TableRow className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : lead.id)}>
                {columns.map((col) => (
                  <TableTd key={col.key} mono={col.mono} className="max-w-[220px] truncate">
                    {col.render(lead)}
                  </TableTd>
                ))}
                <TableTd>
                  <Badge status="neutral">{sourceBadge}</Badge>
                </TableTd>
                <TableTd onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onDelete(lead.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-lo hover:bg-status-danger/10 hover:text-status-danger"
                    aria-label="Delete lead"
                  >
                    <Icon icon="solar:trash-bin-trash-broken" width={14} />
                  </button>
                </TableTd>
              </TableRow>
              {expanded && (
                <TableRow className="h-auto hover:bg-transparent">
                  <TableTd colSpan={columns.length + 2} className="bg-canvas p-3">
                    <LogPanel autoScroll={false} lines={[{ text: JSON.stringify(lead, null, 2), tone: "default" }]} />
                  </TableTd>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

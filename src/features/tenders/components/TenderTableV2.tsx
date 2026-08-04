"use client";

import { Fragment, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from "@/shared/ui/Table";
import LogPanel from "@/shared/ui/LogPanel";
import ExportModal from "./ExportModal";
import type { BadgeStatus } from "@/shared/ui/Badge";

interface Tender {
  id: string | number;
  title: string;
  description?: string;
  status?: "open" | "closed" | string;
  closing_date?: string | null;
  scraped_at?: string | null;
  tender_type?: string | null;
  location?: string | null;
  source_url?: string | null;
  organization?: string | null;
  category?: string | null;
  budget?: number | null;
  [key: string]: unknown;
}

function formatBudget(budget?: number | null): string | null {
  if (budget == null) return null;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(budget);
}

type StatusFilter = "all" | "open" | "closed" | "closing-soon";

function statusBadge(tender: Tender): { label: string; status: BadgeStatus } {
  if (tender.closing_date) {
    const closing = new Date(tender.closing_date);
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (tender.status === "open" && closing >= now && closing <= sevenDays) {
      return { label: "closing soon", status: "warning" };
    }
  }
  if (tender.status === "open") return { label: "open", status: "success" };
  if (tender.status === "closed") return { label: "closed", status: "danger" };
  return { label: tender.status || "unknown", status: "neutral" };
}

function sourceLabel(url?: string | null): string {
  if (!url) return "—";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function TenderTableV2({
  tenders,
  isLoading,
  mode,
  onDeleteTender,
}: {
  tenders: Tender[];
  isLoading: boolean;
  mode: "light" | "dark";
  onDeleteTender: (tender: Tender) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...(tenders || [])];
    if (statusFilter === "open") result = result.filter((t) => t.status === "open");
    if (statusFilter === "closed") result = result.filter((t) => t.status === "closed");
    if (statusFilter === "closing-soon") {
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      result = result.filter((t) => t.closing_date && new Date(t.closing_date) >= now && new Date(t.closing_date) <= sevenDays);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.location?.toLowerCase().includes(q) ||
          t.organization?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tenders, statusFilter, search]);

  const toggleSelected = (id: string | number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTenders = filtered.filter((t) => selected.has(t.id));

  if (isLoading) {
    return <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">Loading tenders…</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Icon icon="solar:magnifer-broken" width={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-lo" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenders…"
            className="h-8 w-full rounded-md border border-app-border bg-surface pl-8 pr-3 text-sm text-text-hi outline-none placeholder:text-text-lo focus:border-brand-500"
          />
        </div>
        {(["all", "open", "closing-soon", "closed"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`h-8 rounded-md border px-2.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              statusFilter === f ? "border-brand-500 bg-brand-500/10 text-brand-500" : "border-app-border text-text-lo hover:text-text-hi"
            }`}
          >
            {f.replace("-", " ")}
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-text-lo">{filtered.length} tenders</span>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableTh className="w-8" />
            <TableTh>Title</TableTh>
            <TableTh>Status</TableTh>
            <TableTh>Organization</TableTh>
            <TableTh>Closing</TableTh>
            <TableTh>Source</TableTh>
            <TableTh className="w-8" />
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableTd colSpan={7} className="py-8 text-center text-text-lo">
                No tenders match your filters.
              </TableTd>
            </TableRow>
          )}
          {filtered.map((tender) => {
            const badge = statusBadge(tender);
            const expanded = expandedId === tender.id;
            return (
              <Fragment key={tender.id}>
                <TableRow className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : tender.id)}>
                  <TableTd onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(tender.id)} onChange={() => toggleSelected(tender.id)} className="accent-brand-500" />
                  </TableTd>
                  <TableTd className="max-w-xs truncate font-medium text-text-hi">{tender.title}</TableTd>
                  <TableTd>
                    <Badge status={badge.status}>{badge.label}</Badge>
                  </TableTd>
                  <TableTd className="max-w-[180px] truncate">{tender.organization || <span className="text-text-lo">—</span>}</TableTd>
                  <TableTd mono>{tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : "—"}</TableTd>
                  <TableTd>
                    <Badge status="neutral">{sourceLabel(tender.source_url)}</Badge>
                  </TableTd>
                  <TableTd onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDeleteTender(tender)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-text-lo hover:bg-status-danger/10 hover:text-status-danger"
                      aria-label="Delete tender"
                    >
                      <Icon icon="solar:trash-bin-trash-broken" width={14} />
                    </button>
                  </TableTd>
                </TableRow>
                {expanded && (
                  <TableRow className="h-auto hover:bg-transparent">
                    <TableTd colSpan={7} className="bg-canvas p-3">
                      <TenderDetail tender={tender} />
                    </TableTd>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {selected.size > 0 && (
        <div className="sticky bottom-4 flex items-center gap-3 self-center rounded-lg border border-app-border bg-surface px-4 py-2 shadow-lg">
          <span className="text-sm text-text-hi">{selected.size} selected</span>
          <Button size="sm" variant="secondary" onClick={() => setExportOpen(true)}>
            <Icon icon="solar:export-broken" width={14} />
            Export
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} tenders={selectedTenders} mode={mode} />
    </div>
  );
}

function TenderDetail({ tender }: { tender: Tender }) {
  const [view, setView] = useState<"parsed" | "raw">("parsed");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        <button
          onClick={() => setView("parsed")}
          className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wide ${view === "parsed" ? "bg-brand-500/10 text-brand-500" : "text-text-lo"}`}
        >
          Parsed
        </button>
        <button
          onClick={() => setView("raw")}
          className={`rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wide ${view === "raw" ? "bg-brand-500/10 text-brand-500" : "text-text-lo"}`}
        >
          Raw
        </button>
      </div>

      {view === "parsed" ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-app-border bg-surface p-3 text-sm md:grid-cols-3">
          {[
            ["Organization", tender.organization],
            ["Category", tender.category],
            ["Budget", formatBudget(tender.budget)],
            ["Location", tender.location],
            ["Type", tender.tender_type as string | undefined],
            ["Format", tender.format as string | undefined],
            ["Scraped", tender.scraped_at ? new Date(tender.scraped_at).toLocaleString() : undefined],
            ["Source URL", tender.source_url],
            ["Description", tender.description],
          ].map(([label, value]) => (
            <div key={label as string} className="flex flex-col gap-0.5">
              <dt className="font-mono text-[10px] uppercase tracking-wide text-text-lo">{label}</dt>
              <dd className="truncate text-text-hi">{(value as string) || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <LogPanel autoScroll={false} lines={[{ text: JSON.stringify(tender, null, 2), tone: "default" }]} />
      )}
    </div>
  );
}

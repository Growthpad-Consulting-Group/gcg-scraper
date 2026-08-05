"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import AppShell from "@/widgets/app-shell/ui/AppShell";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import LogPanel from "@/shared/ui/LogPanel";
import type { BadgeStatus } from "@/shared/ui/Badge";

interface Tender {
  id: string | number;
  title: string;
  description?: string | null;
  status?: string;
  closing_date?: string | null;
  scraped_at?: string | null;
  tender_type?: string | null;
  location?: string | null;
  source_url?: string | null;
  organization?: string | null;
  category?: string | null;
  budget?: number | null;
  document_url?: string | null;
  raw_content?: string | null;
  format?: string | null;
}

function statusBadge(status?: string): { label: string; status: BadgeStatus } {
  if (status === "open") return { label: "open", status: "success" };
  if (status === "closed") return { label: "closed", status: "danger" };
  return { label: status || "unknown", status: "neutral" };
}

function formatBudget(budget?: number | null): string | null {
  if (budget == null) return null;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(budget);
}

export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tender, setTender] = useState<Tender | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"parsed" | "raw">("parsed");

  useEffect(() => {
    const fetchTender = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tenders/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch tender");
        setTender(data.tender);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTender();
  }, [id]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <button onClick={() => router.push("/tenders")} className="flex w-fit items-center gap-1 text-sm text-text-lo hover:text-text-hi">
          <Icon icon="solar:arrow-left-broken" width={16} />
          Back to Tenders
        </button>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-app-border bg-surface">
            <Icon icon="mdi:loading" width={28} className="animate-spin text-brand-500" />
          </div>
        ) : !tender ? (
          <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">Tender not found.</div>
        ) : (
          <>
            <div className="flex flex-col gap-2 rounded-lg border border-app-border bg-surface p-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-lg font-semibold text-text-hi">{tender.title}</h1>
                <Badge status={statusBadge(tender.status).status}>{statusBadge(tender.status).label}</Badge>
              </div>
              {tender.description && <p className="text-sm text-text-lo">{tender.description}</p>}

              <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
                {[
                  ["Organization", tender.organization],
                  ["Category", tender.category],
                  ["Budget", formatBudget(tender.budget)],
                  ["Location", tender.location],
                  ["Closing date", tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : null],
                  ["Type", tender.tender_type],
                  ["Format", tender.format],
                  ["Scraped", tender.scraped_at ? new Date(tender.scraped_at).toLocaleString() : null],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex flex-col gap-0.5">
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-text-lo">{label}</dt>
                    <dd className="truncate text-text-hi">{(value as string) || "—"}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-2 flex flex-wrap gap-2">
                {tender.source_url && (
                  <a href={tender.source_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="secondary">
                      <Icon icon="solar:link-broken" width={14} />
                      Source
                    </Button>
                  </a>
                )}
                {tender.document_url && (
                  <a href={tender.document_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="secondary">
                      <Icon icon="solar:document-broken" width={14} />
                      Document
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2 flex gap-1">
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
                <LogPanel autoScroll={false} lines={[{ text: JSON.stringify(tender, null, 2), tone: "default" }]} />
              ) : (
                <LogPanel
                  autoScroll={false}
                  lines={[{ text: tender.raw_content || "No raw content captured for this tender (scraped before raw capture was added).", tone: "default" }]}
                />
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

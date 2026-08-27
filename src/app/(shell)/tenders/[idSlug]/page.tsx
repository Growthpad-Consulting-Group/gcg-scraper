"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import LogPanel from "@/shared/ui/LogPanel";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import Popover from "@/shared/ui/Popover";
import { parseTenderIdFromSegment, tenderHref } from "@/shared/lib/slug";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { BadgeStatus } from "@/shared/ui/Badge";
import PursuitPanel, { pursuitBadge } from "@/features/tenders/components/PursuitPanel";

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
  currency?: string | null;
  document_url?: string | null;
  document_checked_at?: string | null;
  raw_content?: string | null;
  format?: string | null;
  pursuit_status?: string | null;
  assigned_to?: string | null;
  pursuit_notes?: string | null;
}

function statusBadge(status?: string): { label: string; status: BadgeStatus } {
  if (status === "open") return { label: "open", status: "success" };
  if (status === "closed") return { label: "closed", status: "danger" };
  return { label: status || "unknown", status: "neutral" };
}

function formatBudget(budget?: number | null, currency?: string | null): string | null {
  if (budget == null) return null;
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(budget);
  return currency ? `${currency} ${formatted}` : formatted;
}

/** null once closed/no date — deadline urgency only makes sense for tenders still open. Shows
 * hours instead of "0 days left" inside the final day, since that's the window where the
 * distinction actually matters for deciding whether to act now. */
function daysUntilDeadline(closingDate?: string | null, status?: string): { label: string; urgent: boolean } | null {
  if (!closingDate || status !== "open") return null;
  const msLeft = new Date(closingDate).getTime() - Date.now();
  if (isNaN(msLeft)) return null;
  if (msLeft < 0) return null;

  const hours = Math.ceil(msLeft / (1000 * 60 * 60));
  if (hours <= 24) return { label: hours <= 1 ? "Closes within the hour" : `${hours} hours left`, urgent: true };

  const days = Math.ceil(hours / 24);
  return { label: `${days} days left`, urgent: days <= 3 };
}

interface RelatedTender {
  id: string | number;
  title: string;
  closing_date: string | null;
  organization: string | null;
  tender_type: string | null;
}

export default function TenderDetailPage() {
  const { idSlug } = useParams<{ idSlug: string }>();
  const id = parseTenderIdFromSegment(idSlug);
  const router = useRouter();
  const { resolvedMode: mode } = useTheme();
  const [tender, setTender] = useState<Tender | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolvingDocument, setIsResolvingDocument] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [relatedTenders, setRelatedTenders] = useState<RelatedTender[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);

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

  // A source_url-only document (aggregator listing pages only expose the notice URL, not its
  // attached files) is resolved lazily on first view rather than during scraping, to avoid an
  // extra Firecrawl call per tender on every scrape run. `document_checked_at` caches the
  // attempt so this only ever fires once per tender, even across repeat visits.
  useEffect(() => {
    if (!tender || tender.document_checked_at || !tender.source_url) return;
    setIsResolvingDocument(true);
    fetch(`/api/tenders/${tender.id}/resolve-document`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setTender((prev) => (prev ? { ...prev, document_url: data.document_url, document_checked_at: data.document_checked_at } : prev));
      })
      .catch(() => {})
      .finally(() => setIsResolvingDocument(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender?.id]);

  useEffect(() => {
    if (!tender) return;
    fetch(`/api/tenders/${tender.id}/related`)
      .then((res) => res.json())
      .then((data) => setRelatedTenders(Array.isArray(data.tenders) ? data.tenders : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender?.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const handleShare = async (channel: "email" | "slack") => {
    if (!tender) return;
    if (channel === "email" && !shareEmail.trim()) {
      toast.error("Enter an email address first.");
      return;
    }
    setIsSharing(true);
    try {
      const res = await fetch(`/api/tenders/${tender.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, email: shareEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to share tender");
      toast.success(channel === "email" ? `Sent to ${shareEmail.trim()}` : "Sent to Slack");
      if (channel === "email") setShareEmail("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    if (!tender) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tenders/${tender.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete tender");
      toast.success("Tender deleted");
      router.push("/tenders");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const deadline = tender ? daysUntilDeadline(tender.closing_date, tender.status) : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <button
        onClick={() => router.push("/tenders")}
        className="flex w-fit items-center gap-1 text-sm text-text-lo hover:text-text-hi"
      >
        <Icon icon="solar:arrow-left-broken" width={16} />
        Back to Tenders
      </button>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-app-border bg-surface">
          <Icon
            icon="mdi:loading"
            width={28}
            className="animate-spin text-brand-500"
          />
        </div>
      ) : !tender ? (
        <div className="rounded-lg border border-app-border bg-surface p-6 text-sm text-text-lo">
          Tender not found.
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-2 overflow-hidden rounded-2xl p-4 border group transition-all duration-500 h-full backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 hover:shadow-none bg-surface"
          >
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-lg font-semibold text-text-hi">
                {tender.title}
              </h1>
              <div className="flex shrink-0 items-center gap-2">
                {deadline && (
                  <Badge status={deadline.urgent ? "danger" : "neutral"}>
                    {deadline.label}
                  </Badge>
                )}
                <Badge status={statusBadge(tender.status).status}>
                  {statusBadge(tender.status).label}
                </Badge>
                {pursuitBadge(tender.pursuit_status) && (
                  <Badge status={pursuitBadge(tender.pursuit_status)!.status}>{pursuitBadge(tender.pursuit_status)!.label}</Badge>
                )}
              </div>
            </div>
            {tender.description && (
              <p className="text-sm text-text-lo">{tender.description}</p>
            )}

            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
              {[
                ["Organization", tender.organization],
                ["Category", tender.category],
                ["Budget", formatBudget(tender.budget, tender.currency)],
                ["Location", tender.location],
                [
                  "Closing date",
                  tender.closing_date
                    ? new Date(tender.closing_date).toLocaleDateString()
                    : null,
                ],
                ["Type", tender.tender_type],
                ["Format", tender.format],
                [
                  "Scraped",
                  tender.scraped_at
                    ? new Date(tender.scraped_at).toLocaleString()
                    : null,
                ],
              ].map(([label, value]) => (
                <div key={label as string} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-text-lo">
                    {label}
                  </dt>
                  <dd className="truncate text-text-hi">
                    {(value as string) || "—"}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-2 flex flex-wrap gap-2">
              {tender.source_url && (
                <a
                  href={tender.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="secondary">
                    <Icon icon="solar:link-broken" width={14} />
                    Source
                  </Button>
                </a>
              )}
              {isResolvingDocument ? (
                <Button size="sm" variant="secondary" disabled>
                  <Icon
                    icon="mdi:loading"
                    width={14}
                    className="animate-spin"
                  />
                  Finding document...
                </Button>
              ) : (
                (tender.document_url ||
                  (tender.format &&
                    tender.format !== "HTML" &&
                    tender.source_url)) && (
                  <a
                    href={(tender.document_url || tender.source_url) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="secondary">
                      <Icon icon="solar:document-broken" width={14} />
                      {tender.document_url &&
                      tender.document_url !== tender.source_url
                        ? "Document"
                        : "Source page (no direct document found)"}
                    </Button>
                  </a>
                )
              )}
              <Button size="sm" variant="secondary" onClick={handleCopyLink}>
                <Icon icon="solar:copy-broken" width={14} />
                Copy link
              </Button>
              <Popover
                trigger={() => (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-text-hi transition-colors hover:bg-app-border">
                    <Icon icon="solar:share-broken" width={14} />
                    Share
                  </span>
                )}
                className="w-72"
              >
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-text-lo">
                      Send to email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full rounded-lg border border-app-border bg-canvas p-2 text-sm text-text-hi focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleShare("email")}
                        disabled={isSharing}
                      >
                        <Icon
                          icon={
                            isSharing ? "mdi:loading" : "solar:letter-broken"
                          }
                          width={14}
                          className={isSharing ? "animate-spin" : ""}
                        />
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={() => handleShare("slack")}
                    disabled={isSharing}
                    className="flex items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-sm text-text-hi transition-colors hover:bg-surface-2 disabled:opacity-50"
                  >
                    <Icon icon="mdi:slack" width={16} />
                    Send to Slack
                  </button>
                </div>
              </Popover>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Icon icon="solar:trash-bin-trash-broken" width={14} />
                Delete
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="overflow-hidden rounded-2xl border group transition-all duration-500 h-full backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 hover:shadow-none bg-surface p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <Icon icon="solar:flag-broken" width={16} />
              </div>
              <h2 className="font-mono text-[11px] uppercase tracking-wide text-text-lo">Pursuit</h2>
            </div>
            <PursuitPanel
              tenderId={tender.id}
              initial={{
                pursuit_status: tender.pursuit_status ?? null,
                assigned_to: tender.assigned_to ?? null,
                pursuit_notes: tender.pursuit_notes ?? null,
              }}
              onSaved={(fields) => setTender((prev) => (prev ? { ...prev, ...fields } : prev))}
            />
          </motion.div>

          {relatedTenders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="overflow-hidden rounded-2xl border group transition-all duration-500 h-full backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 hover:shadow-none bg-surface p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                  <Icon icon="solar:widget-broken" width={16} />
                </div>
                <h2 className="font-mono text-[11px] uppercase tracking-wide text-text-lo">
                  Other open tenders{" "}
                  {tender.organization
                    ? `from ${tender.organization}`
                    : `in ${tender.tender_type}`}
                </h2>
              </div>
              <ul className="flex flex-col gap-1.5">
                {relatedTenders.map((rt, i) => {
                  const rtDeadline = daysUntilDeadline(rt.closing_date, "open");
                  return (
                    <motion.li
                      key={rt.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: 0.1 + i * 0.05 }}
                    >
                      <Link
                        href={tenderHref(rt)}
                        className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-sm transition-all hover:border-app-border hover:bg-surface-2"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-lo transition-colors group-hover:bg-brand-500/10 group-hover:text-brand-500">
                          <Icon icon="solar:document-text-broken" width={16} />
                        </div>
                        <span className="min-w-0 flex-1 truncate text-text-hi">
                          {rt.title}
                        </span>
                        {rtDeadline && (
                          <Badge
                            status={rtDeadline.urgent ? "danger" : "neutral"}
                          >
                            {rtDeadline.label}
                          </Badge>
                        )}
                        <Icon
                          icon="solar:arrow-right-broken"
                          width={16}
                          className="shrink-0 text-text-lo opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                        />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          )}

          <div>
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="mb-2 flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-text-lo hover:text-text-hi"
            >
              <Icon
                icon={
                  showRaw
                    ? "solar:alt-arrow-up-broken"
                    : "solar:alt-arrow-down-broken"
                }
                width={12}
              />
              {showRaw
                ? "Hide raw scraped content"
                : "Show raw scraped content"}
            </button>
            {showRaw && (
              <LogPanel
                autoScroll={false}
                lines={[
                  {
                    text:
                      tender.raw_content ||
                      "No raw content captured for this tender (scraped before raw capture was added).",
                    tone: "default",
                  },
                ]}
              />
            )}
          </div>
        </>
      )}

      {tender && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          itemName={tender.title}
          itemType="tender"
          mode={mode}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

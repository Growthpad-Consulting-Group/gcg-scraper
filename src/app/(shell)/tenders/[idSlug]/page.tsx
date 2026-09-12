"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import Badge from "@/shared/ui/Badge";
import LogPanel from "@/shared/ui/LogPanel";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
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
  attachments_checked_at?: string | null;
  raw_content?: string | null;
  format?: string | null;
  pursuit_status?: string | null;
  assigned_to?: string | null;
  pursuit_notes?: string | null;
  matched_keywords?: string[] | null;
  sectors?: string[] | null;
  languages?: string[] | null;
  eligibility?: string | null;
  attachments?: { url: string; name?: string | null }[] | null;
  ai_summary?: string | null;
  ai_summary_generated_at?: string | null;
}

function statusBadge(status?: string): { label: string; status: BadgeStatus } {
  if (status === "open") return { label: "open", status: "success" };
  if (status === "closed") return { label: "closed", status: "danger" };
  return { label: status || "unknown", status: "neutral" };
}

/** The issuing organization's own logo isn't data this app captures — favicons are a reasonable,
 * zero-config stand-in (an org's real site icon, not a guess), derived from the domain the tender
 * was actually scraped from. Not always accurate for aggregator sources (a GIZ tender surfaced via
 * TED shows TED's icon, not GIZ's) — that's inherent to using source_url, not a bug — but a
 * recognizable header image is better than a generic icon for the common case where source_url is
 * the organization's own site (Website Tenders, PPIP, Kenya Treasury, ...). */
function faviconUrl(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    const host = new URL(sourceUrl).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
  } catch {
    return null;
  }
}

function formatBudget(budget?: number | null, currency?: string | null): string | null {
  if (budget == null) return null;
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(budget);
  return currency ? `${currency} ${formatted}` : formatted;
}

// tenders.closing_date is NOT NULL — an unknown deadline is stored as this far-future sentinel
// (see tenderRow.ts's resolveClosingDate) rather than left blank, so it never reads as closed.
const NO_DEADLINE_SENTINEL = "9999-12-31";

function formatClosingDate(closingDate?: string | null): string {
  if (!closingDate || closingDate === NO_DEADLINE_SENTINEL) return "No deadline listed";
  return new Date(closingDate).toLocaleDateString();
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

type RailNode = { icon: string; label: string; sublabel: string; state: "done" | "current" | "upcoming" };

/** A dot-and-line rail where each node is its own icon-in-circle (not a bare dot), with a bold
 * label and a muted sublabel underneath — done nodes solid green, the current node a larger
 * brand-colored ring, upcoming nodes hollow gray, connecting segments colored to match how much
 * of the rail is "done" so far. */
function TimelineRail({ nodes }: { nodes: RailNode[] }) {
  return (
    <div className="flex items-start">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
                n.state === "current"
                  ? "border-brand-500 bg-brand-500/10 text-brand-500"
                  : n.state === "done"
                    ? "border-status-success bg-status-success/10 text-status-success"
                    : "border-app-border bg-surface-2 text-text-lo"
              }`}
            >
              <Icon icon={n.icon} width={20} />
            </div>
            <div className={`mt-2 whitespace-nowrap text-center text-[13px] font-semibold ${n.state === "upcoming" ? "text-text-lo" : "text-text-hi"}`}>
              {n.label}
            </div>
            <div className="whitespace-nowrap text-center text-[11px] text-text-lo">{n.sublabel}</div>
          </div>
          {i < nodes.length - 1 && <div className={`mb-8 h-0.5 flex-1 ${n.state === "done" ? "bg-status-success" : "bg-app-border"}`} />}
        </div>
      ))}
    </div>
  );
}

/** Built only from what this app actually tracks (posted -> open -> deadline), rather than
 * copying DevelopmentAid's procurement-committee stages we have no signal for. Pursuit tracking
 * (Watching/Applied/Won/Lost/Passed) deliberately isn't repeated here as a second rail — it
 * already has its own dedicated, interactive Pursuit panel elsewhere on this page, and a second
 * read-only copy of the same state directly underneath was pure duplication rather than adding
 * information. */
function TenderTimeline({ tender }: { tender: Tender }) {
  const isClosed = tender.status === "closed";
  const nodes: RailNode[] = [
    {
      icon: "solar:upload-minimalistic-broken",
      label: "Posted",
      sublabel: tender.scraped_at ? new Date(tender.scraped_at).toLocaleDateString() : "—",
      state: "done",
    },
    {
      icon: "solar:play-broken",
      label: "Open",
      sublabel: isClosed ? "Bidding closed" : "Accepting bids",
      state: isClosed ? "done" : "current",
    },
    {
      icon: "solar:flag-broken",
      label: "Deadline",
      sublabel: formatClosingDate(tender.closing_date),
      state: isClosed ? "current" : "upcoming",
    },
  ];

  return <TimelineRail nodes={nodes} />;
}

export default function TenderDetailPage() {
  const { idSlug } = useParams<{ idSlug: string }>();
  const id = parseTenderIdFromSegment(idSlug);
  const router = useRouter();
  const { resolvedMode: mode } = useTheme();
  const [tender, setTender] = useState<Tender | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [relatedTenders, setRelatedTenders] = useState<RelatedTender[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (!tender) return;
    fetch(`/api/tenders/${tender.id}/related`)
      .then((res) => res.json())
      .then((data) => setRelatedTenders(Array.isArray(data.tenders) ? data.tenders : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender?.id]);

  // Lazily resolves document_url and, if the original extraction came up empty, attachments —
  // for sources whose listing-page extraction only sees the notice URL, or listing pages with
  // several tenders where attachments got missed/misattributed. Silent (no loading UI): this
  // only fills in data, nothing in the header depends on it anymore. document_checked_at and
  // attachments_checked_at are separate flags (see resolve-document/route.ts) so a tender whose
  // document was already checked before attachments resolution existed still gets one attempt.
  useEffect(() => {
    if (!tender || !tender.source_url) return;
    const needsDocument = !tender.document_checked_at;
    const needsAttachments = !tender.attachments_checked_at && !tender.attachments?.length;
    if (!needsDocument && !needsAttachments) return;
    fetch(`/api/tenders/${tender.id}/resolve-document`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setTender((prev) =>
          prev
            ? {
                ...prev,
                document_url: data.document_url,
                document_checked_at: data.document_checked_at,
                attachments: data.attachments ?? prev.attachments,
                attachments_checked_at: new Date().toISOString(),
              }
            : prev,
        );
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender?.id]);

  // Quick summary: uses the real description when one was captured; otherwise lazily generates a
  // short AI summary from raw_content on first view. `ai_summary_generated_at` caches the attempt
  // (success or not) so repeat views don't re-call the model.
  useEffect(() => {
    if (!tender || tender.description?.trim() || tender.ai_summary_generated_at) return;
    fetch(`/api/tenders/${tender.id}/summarize`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setTender((prev) =>
          prev ? { ...prev, ai_summary: data.ai_summary, ai_summary_generated_at: data.ai_summary_generated_at } : prev,
        );
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender?.id]);

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
              <div className="flex min-w-0 items-start gap-3">
                {faviconUrl(tender.source_url) && (
                  // eslint-disable-next-line @next/next/no-img-element -- a favicon URL isn't
                  // worth next/image's remote-pattern config for a 32px icon.
                  <img
                    src={faviconUrl(tender.source_url)!}
                    alt=""
                    width={70}
                    height={70}
                    className="mt-0.5 shrink-0 rounded-lg border border-app-border bg-white object-contain p-1"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <h1 className="font-display text-lg font-semibold text-text-hi">
                  {tender.title}
                </h1>
              </div>
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
          </motion.div>

          {(tender.description?.trim() || tender.ai_summary) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.02 }}
              className="overflow-hidden rounded-2xl border backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-surface p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                  <Icon icon="solar:document-text-broken" width={16} />
                </div>
                <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-text-lo">Quick summary</h2>
              </div>
              <p className="whitespace-pre-line text-sm text-text-hi">
                {tender.description?.trim() || tender.ai_summary}
              </p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Details sidebar — a single organized reference panel instead of the field grid
               previously crammed into the header card, closer to how a DevelopmentAid/UNGM
               listing separates "the facts" from the narrative content. */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="overflow-hidden rounded-2xl border backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-surface p-4 lg:order-1 lg:col-span-1"
            >
              <div className="mb-4 flex items-center gap-2 border-b border-app-border pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                  <Icon icon="solar:list-check-broken" width={16} />
                </div>
                <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-text-lo">Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {formatClosingDate(tender.closing_date) && (
                  <>
                    <div className="font-medium text-text-lo">Closing date:</div>
                    <div className="text-text-hi">{formatClosingDate(tender.closing_date)}</div>
                  </>
                )}
                {tender.location && (
                  <>
                    <div className="font-medium text-text-lo">Location:</div>
                    <div className="text-text-hi">{tender.location}</div>
                  </>
                )}
                {tender.category && (
                  <>
                    <div className="font-medium text-text-lo">Category:</div>
                    <div className="text-text-hi">{tender.category}</div>
                  </>
                )}
                {tender.organization && (
                  <>
                    <div className="font-medium text-text-lo">Organization:</div>
                    <div className="text-text-hi">{tender.organization}</div>
                  </>
                )}
                {tender.eligibility && (
                  <>
                    <div className="font-medium text-text-lo">Eligibility:</div>
                    <div className="text-text-hi">{tender.eligibility}</div>
                  </>
                )}
                {tender.languages && tender.languages.length > 0 && (
                  <>
                    <div className="font-medium text-text-lo">Languages:</div>
                    <div className="text-text-hi">{tender.languages.join(", ")}</div>
                  </>
                )}
                {formatBudget(tender.budget, tender.currency) && (
                  <>
                    <div className="font-medium text-text-lo">Budget:</div>
                    <div className="text-text-hi">{formatBudget(tender.budget, tender.currency)}</div>
                  </>
                )}
                {tender.tender_type && (
                  <>
                    <div className="font-medium text-text-lo">Type:</div>
                    <div className="text-text-hi">{tender.tender_type}</div>
                  </>
                )}
                {tender.format && (
                  <>
                    <div className="font-medium text-text-lo">Format:</div>
                    <div className="text-text-hi">{tender.format}</div>
                  </>
                )}
              </div>

              {tender.sectors && tender.sectors.length > 0 && (
                <div className="mt-3 border-t border-app-border pt-3">
                  <dt className="mb-1.5 text-sm text-text-lo">Sectors</dt>
                  <div className="flex flex-wrap gap-1.5">
                    {tender.sectors.map((s) => (
                      <span key={s} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-text-hi">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {tender.matched_keywords && tender.matched_keywords.length > 0 && (
                <div className="mt-3 border-t border-app-border pt-3">
                  <dt className="mb-1.5 text-sm text-text-lo">Matched keywords</dt>
                  <div className="flex flex-wrap gap-1.5">
                    {tender.matched_keywords.map((k) => (
                      <span key={k} className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-500">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex h-full flex-col gap-4 lg:order-1 lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
                className="overflow-hidden rounded-2xl border backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-surface p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                    <Icon icon="solar:paperclip-broken" width={16} />
                  </div>
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-text-lo">
                    Attachments{tender.attachments?.length ? ` (${tender.attachments.length})` : ""}
                  </h2>
                </div>
                {tender.attachments && tender.attachments.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {tender.attachments.map((a) => (
                      <li key={a.url}>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-hi transition-colors hover:bg-surface-2"
                        >
                          <Icon icon="solar:document-broken" width={15} className="shrink-0 text-text-lo group-hover:text-brand-500" />
                          <span className="min-w-0 flex-1 truncate">{a.name || a.url}</span>
                          <Icon icon="solar:download-broken" width={14} className="shrink-0 text-text-lo opacity-0 transition-opacity group-hover:opacity-100" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-lo">No attachments listed for this tender.</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex flex-1 flex-col overflow-hidden rounded-2xl border group transition-all duration-500 backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 hover:shadow-none bg-surface p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                    <Icon icon="solar:flag-broken" width={16} />
                  </div>
                  <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-text-lo">Pursuit</h2>
                </div>
                <PursuitPanel
                  tenderId={tender.id}
                  initial={{
                    pursuit_status: tender.pursuit_status ?? null,
                    assigned_to: tender.assigned_to ?? null,
                    pursuit_notes: tender.pursuit_notes ?? null,
                  }}
                  showAssignedTo={false}
                  showNotes={false}
                  onSaved={(fields) => setTender((prev) => (prev ? { ...prev, ...fields } : prev))}
                />
              </motion.div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
            className="overflow-hidden rounded-2xl border backdrop-blur-xl border-slate-100/10 shadow-xl shadow-slate-200/40 dark:shadow-black/20 bg-surface p-4"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                <Icon icon="solar:routing-broken" width={16} />
              </div>
              <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-text-lo">Timeline</h2>
            </div>
            <TenderTimeline tender={tender} />
          </motion.div>

          {relatedTenders.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
                  <Icon icon="solar:widget-broken" width={16} />
                </div>
                <h2 className="font-mono font-bold text-sm uppercase tracking-wide text-text-lo">
                  Other open tenders{" "}
                  {tender.organization
                    ? `from ${tender.organization}`
                    : `in ${tender.tender_type}`}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {relatedTenders.map((rt, i) => {
                  const rtDeadline = daysUntilDeadline(rt.closing_date, "open");
                  return (
                    <motion.div
                      key={rt.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.15 + i * 0.05 }}
                    >
                      <Link
                        href={tenderHref(rt)}
                        className="group flex h-full flex-col gap-2 rounded-2xl border border-app-border bg-surface p-4 transition-all hover:border-brand-500/30 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                            <Icon icon="solar:document-text-broken" width={16} />
                          </div>
                          {rtDeadline && (
                            <Badge
                              status={rtDeadline.urgent ? "danger" : "neutral"}
                              className="shrink-0"
                            >
                              {rtDeadline.label}
                            </Badge>
                          )}
                        </div>
                        <h3 className="line-clamp-2 flex-1 text-sm font-medium text-text-hi">
                          {rt.title}
                        </h3>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-text-lo">
                            {rt.organization || rt.tender_type}
                          </span>
                          <Icon
                            icon="solar:arrow-right-broken"
                            width={14}
                            className="text-text-lo transition-all group-hover:translate-x-0.5"
                          />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="mb-2 flex items-center gap-1 font-mono font-bold text-sm uppercase tracking-wide text-text-lo hover:text-text-hi"
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

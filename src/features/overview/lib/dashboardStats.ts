import type { RunJob } from "./runFeed";

// ─── Source color palette (stable assignment by index) ────────────────────────
export const SOURCE_PALETTE = [
  "#f05d23", // brand orange — anchor, full strength
  "#5eead4", // teal-300
  "#a78bfa", // violet-400
  "#60a5fa", // blue-400
  "#f472b6", // pink-400
  "#fbbf24", // amber-400
  "#67e8f9", // cyan-300
  "#4ade80", // green-400
  "#94a3b8", // slate-400
];

export function sourceColor(index: number): string {
  return SOURCE_PALETTE[index % SOURCE_PALETTE.length];
}

// ─── Tender shape (minimal — only fields the dashboard uses) ─────────────────
export interface DashTender {
  scraped_at: string | null;
  tender_type: string | null;
  status: "open" | "closed" | null;
  country: string | null;
  pursuit_status?: string | null;
  bid_submitted_at?: string | null;
  bid_value?: number | null;
}

// ─── Bid pipeline ─────────────────────────────────────────────────────────────
export interface BidPipelineStats {
  submitted: number;
  won: number;
  lost: number;
  winRate: number | null;
  pipelineValue: number;
}

export function buildBidPipeline(tenders: DashTender[]): BidPipelineStats {
  const submitted = tenders.filter((t) => t.pursuit_status === "applied" || t.pursuit_status === "won" || t.pursuit_status === "lost").length;
  const won = tenders.filter((t) => t.pursuit_status === "won").length;
  const lost = tenders.filter((t) => t.pursuit_status === "lost").length;
  const decided = won + lost;
  const winRate = decided > 0 ? Math.round((won / decided) * 100) : null;
  const pipelineValue = tenders.reduce((sum, t) => sum + (t.bid_value ?? 0), 0);
  return { submitted, won, lost, winRate, pipelineValue };
}

// ─── Source breakdown ─────────────────────────────────────────────────────────
export interface SourceStat {
  name: string;
  count: number;
  pct: number;
  color: string;
}

export function buildSourceBreakdown(tenders: DashTender[]): SourceStat[] {
  const counts = new Map<string, number>();
  for (const t of tenders) {
    const key = t.tender_type || "Other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = tenders.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => ({
      name,
      count,
      pct: Math.round((count / total) * 100),
      color: sourceColor(i),
    }));
}

// ─── Stacked chart data ───────────────────────────────────────────────────────
export interface StackedChartData {
  labels: string[];
  datasets: { label: string; data: number[]; color: string }[];
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildStackedTrend(tenders: DashTender[], days: number, sourceBreakdown: SourceStat[], now: Date = new Date()): StackedChartData {
  // Build day labels (oldest → newest)
  const dayKeys: string[] = [];
  const dayLabels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayKeys.push(toIsoDate(d));
    dayLabels.push(d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }));
  }

  // Top sources only (avoid chart clutter)
  const topSources = sourceBreakdown.slice(0, 6);

  // Count per (day, source)
  const matrix = new Map<string, Map<string, number>>();
  for (const t of tenders) {
    if (!t.scraped_at) continue;
    const dateKey = toIsoDate(new Date(t.scraped_at));
    const source = t.tender_type || "Other";
    if (!matrix.has(dateKey)) matrix.set(dateKey, new Map());
    const dayMap = matrix.get(dateKey)!;
    dayMap.set(source, (dayMap.get(source) ?? 0) + 1);
  }

  const datasets = topSources.map((src) => ({
    label: src.name,
    color: src.color,
    data: dayKeys.map((dk) => matrix.get(dk)?.get(src.name) ?? 0),
  }));

  return { labels: dayLabels, datasets };
}

// ─── Acceptance rate ──────────────────────────────────────────────────────────
export interface AcceptanceStats {
  rate: number | null; // 0–100, null if not enough data
  totalExtracted: number;
  totalAccepted: number;
  totalRejected: number;
}

export function buildAcceptanceStats(jobs: RunJob[]): AcceptanceStats {
  let totalExtracted = 0;
  let totalAccepted = 0;

  for (const j of jobs) {
    const s = j.result_summary;
    if (!s) continue;
    if (typeof s.totalExtracted === "number" && s.totalExtracted > 0) {
      totalExtracted += s.totalExtracted;
      totalAccepted += typeof s.tendersFound === "number" ? s.tendersFound : 0;
    }
  }

  if (totalExtracted === 0) return { rate: null, totalExtracted: 0, totalAccepted: 0, totalRejected: 0 };

  const totalRejected = totalExtracted - totalAccepted;
  return {
    rate: Math.round((totalAccepted / totalExtracted) * 100),
    totalExtracted,
    totalAccepted,
    totalRejected,
  };
}

// ─── Alert items ──────────────────────────────────────────────────────────────
export type AlertSeverity = "error" | "warning" | "info";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  meta: string;
  detail?: string;
  href?: string;
}

export function buildAlerts(jobs: RunJob[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const j of jobs) {
    // Failed runs
    if (j.status === "error") {
      const msg = typeof j.result_summary?.error === "string" ? j.result_summary.error : "No error details captured";
      alerts.push({
        id: `error-${j.id}`,
        severity: "error",
        title: j.label || j.kind,
        meta: "Run failed",
        detail: msg.slice(0, 80),
      });
    }
    // Runs with rejected candidates
    if (typeof j.result_summary?.rejectedBy === "string" && j.status === "done") {
      const REASON_LABEL: Record<string, string> = {
        no_url: "No URL",
        country: "Country mismatch",
        keywords: "Keyword mismatch",
        source_content: "Not on page",
      };
      const reason = j.result_summary.rejectedBy as string;
      alerts.push({
        id: `rejected-${j.id}`,
        severity: "warning",
        title: j.label || j.kind,
        meta: "Candidates rejected",
        detail: REASON_LABEL[reason] || reason,
        href: `/rejected-candidates?reason=${encodeURIComponent(reason)}`,
      });
    }
  }

  return alerts.slice(0, 8);
}

// ─── Daily counts for sparklines ─────────────────────────────────────────────
/** Returns an array of daily tender counts for the last `days` days, oldest first. */
export function buildDailySparkline(tenders: DashTender[], days: number, now: Date = new Date()): number[] {
  const counts = new Map<string, number>();
  for (const t of tenders) {
    if (!t.scraped_at) continue;
    const d = new Date(t.scraped_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const result: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    result.push(counts.get(key) ?? 0);
  }
  return result;
}

// ─── This-week count ─────────────────────────────────────────────────────────
export function buildWeekCount(tenders: DashTender[], now: Date = new Date()): number {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return tenders.filter((t) => t.scraped_at && new Date(t.scraped_at) >= weekAgo).length;
}

// ─── Pending review (no pursuit decision yet) ────────────────────────────────
export function buildPendingReview(tenders: DashTender[]): number {
  return tenders.filter((t) => !t.pursuit_status || t.pursuit_status === "none").length;
}

// ─── Open tenders ─────────────────────────────────────────────────────────────
export function buildOpenCount(tenders: DashTender[]): number {
  return tenders.filter((t) => t.status === "open").length;
}

// ─── Today vs yesterday delta ─────────────────────────────────────────────────
export function buildDayDeltas(tenders: DashTender[]): { today: number; yesterday: number; delta: number } {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = yesterday.toDateString();

  let today = 0;
  let yesterdayCount = 0;
  for (const t of tenders) {
    if (!t.scraped_at) continue;
    const ds = new Date(t.scraped_at).toDateString();
    if (ds === todayStr) today++;
    else if (ds === yestStr) yesterdayCount++;
  }

  return { today, yesterday: yesterdayCount, delta: today - yesterdayCount };
}

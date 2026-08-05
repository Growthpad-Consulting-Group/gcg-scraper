export interface TenderTrendPoint {
  /** Short day label for the x-axis, e.g. "Mon 3" */
  label: string;
  count: number;
}

/** Buckets tenders by scrape day for the last `days` days (oldest first), so the overview chart
 * can show a trend even on days with zero scrapes instead of skipping them. */
export function buildTenderTrend(tenders: { scraped_at: string | null }[], days: number, now: Date = new Date()): TenderTrendPoint[] {
  const counts = new Map<string, number>();
  for (const t of tenders) {
    if (!t.scraped_at) continue;
    const key = new Date(t.scraped_at).toDateString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points: TenderTrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const key = day.toDateString();
    points.push({
      label: day.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      count: counts.get(key) ?? 0,
    });
  }
  return points;
}

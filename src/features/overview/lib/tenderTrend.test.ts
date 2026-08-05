import { describe, it, expect } from "vitest";
import { buildTenderTrend } from "./tenderTrend";

describe("buildTenderTrend", () => {
  it("returns one point per day, oldest first, ending on `now`", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const points = buildTenderTrend([], 3, now);
    expect(points).toHaveLength(3);
    expect(points[2].label).toBe(now.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }));
  });

  it("buckets tenders into the day they were scraped", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const tenders = [
      { scraped_at: "2026-01-10T01:00:00Z" },
      { scraped_at: "2026-01-10T23:00:00Z" },
      { scraped_at: "2026-01-09T08:00:00Z" },
    ];
    const points = buildTenderTrend(tenders, 3, now);
    expect(points.map((p) => p.count)).toEqual([0, 1, 2]);
  });

  it("ignores tenders with no scraped_at", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const points = buildTenderTrend([{ scraped_at: null }], 1, now);
    expect(points[0].count).toBe(0);
  });
});

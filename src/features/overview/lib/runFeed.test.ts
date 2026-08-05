import { describe, it, expect, vi, afterEach } from "vitest";
import { runDuration, type RunJob } from "./runFeed";

function job(overrides: Partial<RunJob>): RunJob {
  return {
    id: "1",
    task_id: null,
    kind: "search-query",
    label: null,
    status: "done",
    progress: null,
    result_summary: null,
    created_at: new Date().toISOString(),
    finished_at: null,
    ...overrides,
  };
}

describe("runDuration", () => {
  afterEach(() => vi.useRealTimers());

  it("returns null for a queued job (hasn't started)", () => {
    expect(runDuration(job({ status: "queued" }))).toBeNull();
  });

  // Regression test: previously only computed a duration when finished_at was set, so a
  // still-running job always showed a blank placeholder instead of elapsed time.
  it("computes elapsed-so-far for a running job, not null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30Z"));
    const running = job({ status: "running", created_at: "2026-01-01T00:00:00Z", finished_at: null });
    expect(runDuration(running)).toBe("30s");
  });

  it("formats seconds only under a minute", () => {
    const j = job({ created_at: "2026-01-01T00:00:00Z", finished_at: "2026-01-01T00:00:45Z" });
    expect(runDuration(j)).toBe("45s");
  });

  it("formats minutes and seconds under an hour", () => {
    const j = job({ created_at: "2026-01-01T00:00:00Z", finished_at: "2026-01-01T00:05:30Z" });
    expect(runDuration(j)).toBe("5m 30s");
  });

  // Regression test: previously rendered raw total minutes with no unit conversion
  // (e.g. "1257m 49s" instead of breaking into hours/days).
  it("converts into hours/minutes/seconds instead of raw minutes", () => {
    const j = job({ created_at: "2026-01-01T00:00:00Z", finished_at: "2026-01-01T20:57:49Z" });
    expect(runDuration(j)).toBe("20h 57m 49s");
  });

  it("converts into days/hours/minutes for multi-day durations", () => {
    const j = job({ created_at: "2026-01-01T00:00:00Z", finished_at: "2026-01-03T05:15:00Z" });
    expect(runDuration(j)).toBe("2d 5h 15m");
  });
});

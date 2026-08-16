import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeStatus, resolveClosingDate, resolveOptionalFields, insertTenderRows, type TenderRow } from "./tenderRow";

describe("computeStatus", () => {
  it("treats a missing date as open", () => {
    expect(computeStatus(null)).toBe("open");
  });

  it("treats an unparseable date as open", () => {
    expect(computeStatus("not a date")).toBe("open");
  });

  it("treats a future date as open", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    expect(computeStatus(future)).toBe("open");
  });

  it("treats a past date as closed", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    expect(computeStatus(past)).toBe("closed");
  });
});

describe("resolveClosingDate", () => {
  // Regression test: tenders.closing_date is NOT NULL — resolveClosingDate previously returned
  // `null` for missing dates and crashed every insert with no date extracted.
  it("falls back to the sentinel for a missing date instead of null", () => {
    expect(resolveClosingDate(null)).toBe("9999-12-31");
    expect(resolveClosingDate(undefined)).toBe("9999-12-31");
  });

  it("falls back to the sentinel for an unparseable date", () => {
    expect(resolveClosingDate("not a date")).toBe("9999-12-31");
  });

  it("normalizes a valid date to YYYY-MM-DD", () => {
    expect(resolveClosingDate("2026-03-15T10:00:00+03:00")).toBe("2026-03-15");
  });

  // Kenya Treasury wraps dates in extra text and prose day suffixes (PPIP) trip up a bare
  // `new Date()` call — these previously silently fell back to "no deadline" instead of the
  // tender's real closing date.
  it("extracts a date from Kenya Treasury's 'Thu, MM/DD/YYYY - HH:MM' format", () => {
    expect(resolveClosingDate("Thu, 08/06/2026 - 15:00")).toBe("2026-08-06");
  });

  it("strips PPIP's ordinal day suffix", () => {
    expect(resolveClosingDate("August 11th, 2026")).toBe("2026-08-11");
  });

  // Job in Rwanda's dashes are always day-first, unlike native Date's month-first assumption —
  // "10-08-2026" previously silently resolved to October 8 instead of August 10.
  it("parses dash dates as day-first", () => {
    expect(resolveClosingDate("21-08-2026")).toBe("2026-08-21");
    expect(resolveClosingDate("10-08-2026")).toBe("2026-08-10");
  });

  // Slash dates are genuinely ambiguous by source convention when both segments are ≤12 —
  // GHANEPS is day-first (DD/MM), Kenya Treasury is month-first (MM/DD), same separator,
  // opposite meaning. An unambiguous segment (>12) always wins regardless of the hint; only the
  // truly ambiguous case needs it.
  it("resolves an unambiguous slash date the same way regardless of dateFormat hint", () => {
    expect(resolveClosingDate("28/08/2026 14:00:00")).toBe("2026-08-28");
    expect(resolveClosingDate("28/08/2026 14:00:00", "DMY")).toBe("2026-08-28");
  });

  it("defers to the dateFormat hint only when the slash date is genuinely ambiguous", () => {
    expect(resolveClosingDate("08/09/2026")).toBe("2026-08-09"); // default MDY: Aug 9
    expect(resolveClosingDate("08/09/2026", "MDY")).toBe("2026-08-09"); // explicit MDY: Aug 9
    expect(resolveClosingDate("08/09/2026", "DMY")).toBe("2026-09-08"); // DMY: Sep 8
  });
});

describe("resolveOptionalFields", () => {
  // Regression test: the extraction model defaults unset numeric fields to 0 rather than
  // omitting them — a genuine $0 budget isn't a real case worth distinguishing from "unknown".
  it("treats a budget of 0 as not provided", () => {
    expect(resolveOptionalFields({ title: "x", closing_date: null, source_url: null, budget: 0 }).budget).toBeNull();
  });

  it("keeps a real positive budget", () => {
    expect(resolveOptionalFields({ title: "x", closing_date: null, source_url: null, budget: 50000 }).budget).toBe(50000);
  });

  it("rejects non-finite budgets", () => {
    expect(resolveOptionalFields({ title: "x", closing_date: null, source_url: null, budget: NaN }).budget).toBeNull();
  });

  it("trims strings and treats empty strings as null", () => {
    const result = resolveOptionalFields({ title: "x", closing_date: null, source_url: null, organization: "  Kenya Bureau of Standards  ", category: "" });
    expect(result.organization).toBe("Kenya Bureau of Standards");
    expect(result.category).toBeNull();
  });

  it("truncates location to 100 chars (tenders.location is varchar(100))", () => {
    const long = "x".repeat(150);
    expect(resolveOptionalFields({ title: "x", closing_date: null, source_url: null, location: long }).location).toHaveLength(100);
  });
});

describe("insertTenderRows", () => {
  function makeRow(overrides: Partial<TenderRow> = {}): TenderRow {
    return {
      title: "Supply of office furniture",
      description: null,
      closing_date: "2026-09-01",
      source_url: "https://example.com/tender/1",
      status: "open",
      tender_type: "supplies",
      format: "scrape",
      scraped_at: new Date().toISOString(),
      organization: null,
      category: null,
      location: null,
      country: null,
      budget: null,
      currency: null,
      document_url: null,
      raw_content: null,
      job_id: null,
      ...overrides,
    };
  }

  /** Mimics the two calls insertTenderRows makes: a `select().in()` lookup for existing
   * title/closing_date pairs, then an `upsert().select()` whose RETURNING set — like real
   * Postgres `ON CONFLICT DO NOTHING` — only includes rows not already in `conflictSourceUrls`. */
  function fakeSupabase(opts: { existing?: { title: string; closing_date: string }[]; conflictSourceUrls?: Set<string> } = {}) {
    return {
      from: () => ({
        select: () => ({
          in: async () => ({ data: opts.existing ?? [] }),
        }),
        upsert: (rows: TenderRow[]) => ({
          select: async () => ({
            data: rows
              .filter((r) => !opts.conflictSourceUrls?.has(r.source_url))
              .map((r, i) => ({
                id: i + 1,
                title: r.title,
                closing_date: r.closing_date,
                status: r.status,
                organization: r.organization,
                location: r.location,
                category: r.category,
              })),
            error: null,
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  it("returns zeros without querying for an empty input", async () => {
    const result = await insertTenderRows(fakeSupabase(), []);
    expect(result).toEqual({ inserted: 0, open: 0, closed: 0, rows: [] });
  });

  // This is an actionable-opportunities tracker, not an archive — closed tenders are dropped
  // before insert regardless of whether they're duplicates.
  it("drops closed tenders before insert", async () => {
    const rows = [makeRow({ source_url: "https://example.com/1", status: "open" }), makeRow({ source_url: "https://example.com/2", status: "closed" })];
    const result = await insertTenderRows(fakeSupabase(), rows);
    expect(result.inserted).toBe(1);
    expect(result.rows.map((r) => r.id)).toEqual([1]);
  });

  it("dedupes rows sharing the same source_url within the same batch", async () => {
    const rows = [
      makeRow({ source_url: "https://example.com/same", title: "First extraction" }),
      makeRow({ source_url: "https://example.com/same", title: "Second extraction" }),
    ];
    const result = await insertTenderRows(fakeSupabase(), rows);
    expect(result.inserted).toBe(1);
  });

  it("filters out tenders already in the DB by normalized title + closing_date", async () => {
    const rows = [makeRow({ title: "Supply of Office Furniture!!", closing_date: "2026-09-01" })];
    const existing = [{ title: "supply of office furniture", closing_date: "2026-09-01" }];
    const result = await insertTenderRows(fakeSupabase({ existing }), rows);
    expect(result).toEqual({ inserted: 0, open: 0, closed: 0, rows: [] });
  });

  // Regression: counts must reflect what actually got returned by the upsert (post ON CONFLICT
  // DO NOTHING), not just the pre-filter row list — an earlier version computed them from the
  // latter and silently drifted from what was actually inserted.
  it("derives open/closed counts from the rows actually returned by the upsert, not the input list", async () => {
    const rows = [makeRow({ source_url: "https://example.com/a" }), makeRow({ source_url: "https://example.com/b" })];
    const result = await insertTenderRows(fakeSupabase({ conflictSourceUrls: new Set(["https://example.com/b"]) }), rows);
    expect(result.inserted).toBe(1);
    expect(result.open).toBe(1);
    expect(result.closed).toBe(0);
  });

  it("throws when the upsert reports an error", async () => {
    const failing = {
      from: () => ({
        select: () => ({ in: async () => ({ data: [] }) }),
        upsert: () => ({ select: async () => ({ data: null, error: new Error("db down") }) }),
      }),
    } as unknown as SupabaseClient;
    await expect(insertTenderRows(failing, [makeRow()])).rejects.toThrow("db down");
  });
});

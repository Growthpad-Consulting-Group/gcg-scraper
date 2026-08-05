import { describe, it, expect } from "vitest";
import { computeStatus, resolveClosingDate, resolveOptionalFields } from "./tenderRow";

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

import { describe, it, expect } from "vitest";
import { formatClosingDate } from "./notify";

describe("formatClosingDate", () => {
  it("shows 'no deadline listed' for the sentinel", () => {
    expect(formatClosingDate("9999-12-31")).toBe("no deadline listed");
  });

  it("formats a real date with an ordinal day and full month name", () => {
    expect(formatClosingDate("2026-09-20")).toBe("closes 20th September 2026");
    expect(formatClosingDate("2026-01-01")).toBe("closes 1st January 2026");
    expect(formatClosingDate("2026-03-02")).toBe("closes 2nd March 2026");
    expect(formatClosingDate("2026-03-03")).toBe("closes 3rd March 2026");
    expect(formatClosingDate("2026-03-11")).toBe("closes 11th March 2026");
    expect(formatClosingDate("2026-03-12")).toBe("closes 12th March 2026");
    expect(formatClosingDate("2026-03-13")).toBe("closes 13th March 2026");
  });

  it("falls back to the raw string for an unparseable date", () => {
    expect(formatClosingDate("not a date")).toBe("closes not a date");
  });
});

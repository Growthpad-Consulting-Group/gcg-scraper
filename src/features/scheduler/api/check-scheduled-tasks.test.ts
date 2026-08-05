import { describe, it, expect } from "vitest";
import { isDue } from "./check-scheduled-tasks";

describe("isDue", () => {
  it("is due immediately if never run", () => {
    expect(isDue({ frequency: "Daily", last_run: null })).toBe(true);
  });

  it("is not due if last run was within the frequency window", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isDue({ frequency: "Daily", last_run: oneHourAgo })).toBe(false);
  });

  it("is due once the frequency window has elapsed", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(isDue({ frequency: "Daily", last_run: twoDaysAgo })).toBe(true);
  });

  it("respects Hourly", () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const ninetyMinAgo = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    expect(isDue({ frequency: "Hourly", last_run: thirtyMinAgo })).toBe(false);
    expect(isDue({ frequency: "Hourly", last_run: ninetyMinAgo })).toBe(true);
  });

  it("falls back to Daily for an unrecognized or missing frequency", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isDue({ frequency: "Nonsense", last_run: oneHourAgo })).toBe(false);
    expect(isDue({ frequency: null, last_run: oneHourAgo })).toBe(false);
  });
});

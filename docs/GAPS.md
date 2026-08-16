# GCG Tender Dashboard — Known Gaps & Missing Features

Refreshed 2026-08-15 against current code + git history. Original audit was 2026-08-04–05; most of
that list has since shipped (see "Resolved since the last audit" below). Severity is about impact
on the app doing its one job: finding tenders and telling the right person about them on time.

Status legend: 🔴 broken/missing entirely · 🟡 works but degraded/limited · 🟢 fixed & verified

---

## Open gaps

### 🔴 SMS notifications do nothing
`sms_notifications_enabled` is stored and collected in the UI but nothing sends an SMS — no
provider (Twilio etc.) wired up anywhere. Unchanged since the last audit; explicitly out of scope.

### 🟡 MCP access (ChatGPT/Codex/Claude) is all-or-nothing
`/api/mcp` (added 2026-08-15) gives any client holding `MCP_LOGIN_SECRET` full read access to
every tender and lead, with no per-user identity and no logging of who queried what through it.
Acceptable for one person using it directly; would need real per-user tokens and query logging
before handing the secret to more than one person.

### 🟡 Firecrawl API version drift — mitigated, not eliminated
Endpoints are explicitly version-pinned (`/v1/scrape`, `/v1/search`, `/v2/parse` — not "latest"),
so this isn't unpinned drift risk. The real risk is Firecrawl changing a `200 OK` response's
*shape* under an unchanged endpoint — already confirmed live once (`/v1/search`'s `data` field
moved from a bare array to `{ web: [...] }` under some accounts; both shapes are now handled).
When that happens, extraction/search/parse silently return `0 results` — indistinguishable from a
genuinely empty page without checking the raw response by hand.

Improved today: `firecrawlExtract.ts`, `firecrawlParse.ts`, and `firecrawlSearch.ts` now
`console.warn` the raw response (truncated) whenever a `200` doesn't match the expected shape, so
"0 new tenders" is diagnosable from the job log without re-deriving this investigation. Still no
schema validation (e.g. zod) on the response — a deliberate scope call, not an oversight: the
warn-and-degrade-to-empty behavior is the same either way, this only makes the failure visible.

### 🟡 Test coverage — DB-touching paths still not unit tested
`insertTenderRows` (the function directly implicated in the near-dup counting bug from the last
audit) is now covered by 7 unit tests today, using a fake `SupabaseClient` — dedup by `source_url`,
closed-tender filtering, existing-row filtering by normalized title+date, and the counts-from-
returned-rows regression are all pinned down. What's still untested: the Inngest job functions
themselves (`run-scrape.ts`, `run-source-scrape.ts`, `run-website-scrape.ts`,
`run-document-parse.ts`, `run-linkedin-tenders-scrape.ts`) — these remain proven by live testing
each session, not CI. 49 tests total (up from 17 at the last audit).

---

## Resolved since the last audit (2026-08-05 → 2026-08-15)

- **Slack notifications** — `SLACK_WEBHOOK_URL` is now configured, plus continued formatting work
  (card-style tender alerts, closing-soon reminders). No longer blocked; worth one live click-
  through to confirm end-to-end, but the "untested" gap itself is closed.
- **ReliefWeb Jobs** — switched from HTML-scrape+LLM-extract to ReliefWeb's own structured API
  (`0e578bb`) — real fields, no fabrication risk.
- **PPIP 429s / Firecrawl scrape timeouts** — now retried instead of failing the whole run
  (`11b4f85`).
- **`raw_content` over-fetching** — no longer downloaded for every row on every list load, only
  when a row's raw tab is actually expanded (`044d5d4`) — was the single biggest driver of Vercel
  data transfer for this app.
- **Cross-source organization mismatches** — extracted tenders whose `organization` doesn't
  actually appear on the scraped page are now rejected instead of trusted (`a2fbebc`).
- **"0 new tenders" diagnosability** — job log now breaks down *why* raw extractions didn't become
  new tenders (rejected by a filter vs. already a duplicate) instead of just reporting a bare count
  (`12ec034`).

---

## What's left

Nothing 🔴 except SMS (still explicitly out of scope). Three 🟡 items open:

1. **SMS notifications** — needs a provider (Twilio or similar) wired up; UI/schema already exist.
2. **MCP access scoping** — fine for single-user use today; revisit if more than one person gets
   the shared secret.
3. **Inngest job functions untested** — the pure-logic pieces they call (`insertTenderRows`,
   `computeStatus`, `resolveClosingDate`, `isDue`, etc.) are now well covered; the orchestration
   functions themselves still rely on live testing per session.

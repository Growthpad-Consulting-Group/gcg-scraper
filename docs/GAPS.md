# GCG Tender Dashboard — Known Gaps & Missing Features

Audit compiled from live end-to-end testing (2026-08-04 – 2026-08-05). Each item is verified
against actual code, not assumed. Severity is about impact on the app doing its one job: finding
tenders and telling the right person about them on time.

Status legend: 🔴 broken/missing entirely · 🟡 works but degraded/limited · 🟢 fixed & verified

---

## 1. Automation

### 🟢 Scheduled tasks never ran automatically
Added `check-scheduled-tasks.ts`, an Inngest **cron** function (`*/15 * * * *`) that checks every
enabled task's `frequency` + `last_run` and starts it via the shared `startTaskRun()` helper (also
used by the manual "Run Task" button, so the two paths can't drift). `isDue()` unit-tested.

### 🟢 In-app notifications were never created
`notify.ts`, wired into all three scrape flows' mark-done step. Fires for task-linked runs with
`tendersFound > 0`. Live-verified.

### 🟢 Email notifications did nothing
Sends via shared `sendEmail()` (`src/shared/lib/mailer.ts`) when `email_notifications_enabled`, to
the task owner plus parsed `custom_emails`. Live-verified.

### 🟡 Slack notifications — code done, not live-tested
Posts via `sendSlackMessage()` (`src/shared/lib/slack.ts`, incoming webhook) when
`slack_notifications_enabled`. Needs `SLACK_WEBHOOK_URL` set — no webhook URL was available to
test against this session. Fire a real test once one exists.

### 🔴 SMS notifications still do nothing
`sms_notifications_enabled` is stored and collected in the UI but nothing sends an SMS — no
provider (Twilio etc.) wired up anywhere. Explicitly out of scope for now.

### 🟢 Scheduler run history was empty
`task_logs` (read by `LogsModal`) had nothing writing to it. `logTaskEvent`/`logJobOutcome`
(`src/features/scheduler/api/taskLog.ts`) now log run-started/finished/failed against the task.
Live-verified.

---

## 2. Scraping pipeline

### 🟢 Run Query produced zero tenders
Now uses Firecrawl `/search` + `extractTenders` + insert. Live-verified: 46 real tenders from one
query.

### 🟢 `closing_date` NOT NULL crash
Falls back to a sentinel via `resolveClosingDate()`. Unit-tested.

### 🟢 Jobs stuck at `running` forever on error
All three flows now have a catch-all that marks `error` on failure.

### 🟢 Race condition on `source_url` insert
`upsert` + `ignoreDuplicates` via shared `insertTenderRows()`, which also filters near-duplicates
(normalized title + closing_date) and returns accurate open/closed counts for what was *actually*
inserted post-filter — an earlier version of this session's own near-dup filter caused the
returned counts to drift from reality; caught via live test, fixed, re-verified (46/46 matched).

### 🟢 No real cancellation
Real `/api/jobs/[id]/cancel` endpoint + cooperative cancellation checks between steps, for tenders
*and* leads (Apify runs are aborted via `abortRun()`, not just marked canceled locally).

### 🟢 Run Query was slow (minutes per query)
Extraction parallelized (`Promise.all` instead of a sequential loop) in all three flows.
Live-verified: same 10-result query dropped from ~3 minutes to ~48 seconds.

### 🟢 "Website Tenders" batch never rotated past the first 15
`websites.last_scraped_at`, batch query orders oldest-checked-first.

### 🟢 Extraction schema was thin
`organization`, `category`, `location`, `budget`, `document_url` extracted and stored. Live-verified
against real pages (KEBS, AFR Rwanda) — organization, category, document links all populated
correctly.

### 🟡 Firecrawl API version drift risk
Already hit twice live this session (rejected `sources` param; response shape assumptions). No
version pinning, no response schema validation. Structural risk, not an open bug — just something
to watch for after any Firecrawl account/plan change.

### 🟢 No tests
`vitest` set up. 17 tests covering the logic that already caused two production bugs today
(`computeStatus`, `resolveClosingDate`, `resolveOptionalFields`, `isDue`). Not full coverage —
DB-touching code (`insertTenderRows`, the Inngest functions themselves) still relies on live
testing, not unit tests, since mocking Supabase meaningfully was out of scope for this pass.

---

## 3. Tenders data & UI

### 🟢 No pagination on `/api/tenders`
`limit`/`offset` params (default 500, max 2000), `/tenders` page has a "Load more" button instead
of fetching everything unbounded.

### 🟢 "Raw" view wasn't actually raw
`extractTenders` now also fetches `markdown` format from Firecrawl and stores it as
`tenders.raw_content`. The raw/parsed toggle shows real scraped page content. Live-verified.

### 🟢 No tender detail page
`/tenders/[id]` — full detail view, source/document links, parsed + raw tabs.

### 🟢 No de-dup across near-identical tenders
See "Race condition on `source_url` insert" above — same fix covers both.

### 🟢 No data retention / cleanup
`/api/cron/cleanup` deletes closed tenders >90 days past `closing_date` and finished jobs >30 days
old. Wired to an external cron-job.org daily trigger and live-tested against production.

---

## 4. Leads

### 🟢 GMB leads pipeline — verified
Live-tested end to end: real Apify run, 27 leads landed with real business names, phones, ratings.

### 🟢 LinkedIn leads pipeline — verified
Live-tested end to end: real Apify run, 25 leads landed with real names, headlines, profile URLs.

### 🟢 No export for leads
`LeadsExportButton` (CSV, `react-csv`) added to both GMB and LinkedIn tabs.

### 🟢 No cancellation for lead jobs
Same cooperative-cancellation pattern as tenders, plus an actual Apify `abortRun()` call so the
remote run stops too, not just the local polling loop.

---

## 5. Auth

### 🟢 Magic link flow
Full flow live-tested headlessly: issue → email sent → token lookup → consume → user resolved →
token correctly one-time-used and deleted. The browser-side `/verify` → session-cookie leg wasn't
clicked through in an actual browser, but every piece of logic behind it was exercised directly.

---

## What's left

Nothing 🔴 except SMS (explicitly skipped this round). Everything else still open is 🟡 — degraded
but not broken:

1. **Slack notifications** — blocked on you providing `SLACK_WEBHOOK_URL` and one live test.
2. **Firecrawl API version drift** — not a bug, a standing risk. Worth a glance if extraction
   ever starts silently returning empty results after a Firecrawl-side change.
3. **Test coverage is partial** — pure logic only; the DB-touching paths are still proven by live
   testing each session, not CI-enforced.

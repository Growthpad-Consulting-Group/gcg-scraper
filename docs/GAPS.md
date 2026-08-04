# GCG Tender Dashboard — Known Gaps & Missing Features

Audit compiled from live end-to-end testing (2026-08-04). Each item is verified against actual
code, not assumed — see the file/line pointers. Severity is about impact on the app doing its one
job: finding tenders and telling the right person about them on time.

Status legend: 🔴 broken/missing entirely · 🟡 works but degraded/limited · 🟢 fixed this session

---

## 1. Automation (the core promise of the app)

### 🟢 Fixed this session: scheduled tasks never ran automatically
`scheduled_tasks.frequency` ("Daily", "Hourly", ...) was stored and shown in the UI, but nothing
ever read it. Added `check-scheduled-tasks.ts`, an Inngest **cron** function (`*/15 * * * *`) that
checks every enabled task's `frequency` + `last_run` and starts it via the shared `startTaskRun()`
helper (also now used by the manual "Run Task" button, so the two paths can't drift). Verified
against real data: 10 enabled tasks found, most stale since April/May 2025.

### 🔴 Notifications are never created
`src/app/api/notifications/route.ts` only implements `GET`. There is no `POST` anywhere in the
codebase that inserts a row into `notifications`. The bell icon, the unread badge, the
Notifications dropdown — all wired correctly on the frontend, all permanently empty.

### 🔴 Email/SMS/Slack toggles do nothing
`AddSchedulerModal`/`EditTaskModal` collect `email_notifications_enabled`,
`sms_notifications_enabled`, `slack_notifications_enabled` and persist them, but no code path ever
reads these flags to actually send anything. `SMTP_*` env vars exist and are used by
`features/auth/api/magic-link.ts` for login links only — there is no tender-found email at all.

### 🟡 Scheduler run history / logs are empty
`LogsModal` reads from `/api/scheduled-tasks/[id]/logs` → `task_logs` table. Nothing in the new
Inngest pipeline writes to `task_logs` (it's a legacy table from the retired Python backend).
Clicking "View Logs" on any task run via the new pipeline will show nothing.

---

## 2. Scraping pipeline

### 🟢 Fixed this session: Run Query produced zero tenders
`run-scrape.ts` scraped raw search-engine HTML and discarded it. Now uses Firecrawl `/search` +
`extractTenders` + insert. Live-verified: 41 real tenders from one query.

### 🟢 Fixed this session: `closing_date` NOT NULL crash
All three insert flows wrote `null` when no date was extracted; column is NOT NULL. Now falls
back to a sentinel via `resolveClosingDate()`.

### 🟢 Fixed this session: jobs stuck at `running` forever on error
No catch-all existed; a thrown error left the row permanently `running`. All three flows now mark
`error` on failure.

### 🟢 Fixed this session: race condition on `source_url` insert
Select-then-filter-then-insert races between concurrent jobs. Now `upsert` +
`ignoreDuplicates` via shared `insertTenderRows()`.

### 🟢 Fixed this session: no real cancellation
Cancel button only changed local UI state. Now a real `/api/jobs/[id]/cancel` endpoint +
cooperative cancellation checks between steps.

### 🟡 Run Query is inherently slow (minutes per query)
Sequential `for` loop, one Firecrawl extract call per search result (~10–60s each × up to 10
results). Not parallelized. Acceptable for occasional ad-hoc use; bad if it becomes the primary
discovery path.

### 🟡 "Website Tenders" batch only covers 15 sites per run, no rotation
`BATCH_SIZE = 15`, always takes the first 15 by `id` order — the same 15 every time, never
reaching sites further down the list. No `last_scraped_at` column to prioritize least-recently
checked sites. Comment in code admits this ("a known limitation, not full coverage per run").

### 🟡 Extraction schema is thin
`EXTRACTION_SCHEMA` in `firecrawlExtract.ts` only asks for `title`, `closing_date`, `source_url`,
`description`. What a person actually needs to act on a tender:

- **Title + closing date** — already extracted, already primary in the Tenders table.
- **Source/issuer** — *who's asking*. Currently only inferable from `source_url`'s domain, which
  breaks down for aggregators (UNGM, ReliefWeb) where many different issuing organizations share
  one domain. Needs its own field.
- **Value/budget** — not extracted at all. Often not published, but worth a nullable field for
  when it is — currently silently dropped even if present on the page.
- **Category/sector** — not extracted. Would let you filter "IT tenders" vs. "construction
  tenders" instead of keyword-matching against title/description text.
- **Document link** — `source_url` is the *listing* page, not necessarily the actual RFP
  document/PDF to download. No separate field for the direct document link.

Extending the schema (and the `tenders` table) for organization + category is the highest-value,
lowest-effort pair of these — both are usually visible on the same page and just need to be asked
for in the extraction prompt/schema.

### 🟡 Firecrawl API version drift risk
Already hit once live (`sources` param rejected, response shape assumption wrong). No version
pinning, no schema validation on responses — a future Firecrawl account/API change will fail
silently or loudly with no early warning.

### 🔴 No tests
Zero automated test coverage on any scraping/extraction/insert logic. Every fix this session was
verified by hand via live Inngest runs — not repeatable, not regression-proof.

---

## 3. Tenders data & UI

### 🟡 No pagination on `/api/tenders`
`select("*")` with no `limit`/range — fine at current row counts, will degrade as the table grows
(especially once Scheduler actually runs automatically and volume increases).

### 🟡 "Raw" view isn't actually raw
`TenderTableV2`'s raw/parsed toggle re-serializes the *parsed* tender row as JSON — the actual
scraped HTML/markdown from Firecrawl is never stored, so there's no real raw source to inspect.

### 🟡 No tender detail page
Rows expand inline only; no shareable per-tender URL.

### 🟡 No de-dup across near-identical tenders
Uniqueness is only on exact `source_url`. The same tender re-listed on two different aggregator
sites (e.g. UNGM + a country portal) creates two rows.

### 🔴 No data retention / cleanup
`tenders` and `scrape_jobs` grow forever — nothing ever deletes old closed tenders or old finished
job rows. Was a non-issue while nothing ran automatically; becomes a real problem now that the
cron trigger is live and the table will keep growing unattended.

---

## 4. Leads

### 🔴 Never live-tested this session
GMB/LinkedIn lead scraping (Apify-backed) — unverified whether `APIFY_API_TOKEN` is valid/working,
unverified end-to-end.

### 🟡 No export for leads
`ExportModal` exists for tenders only; no equivalent for GMB/LinkedIn leads.

### 🟡 No cancellation for lead jobs
Same "fake cancel" pattern tenders had, never addressed for `run-gmb-scrape.ts` /
`run-linkedin-scrape.ts`.

---

## 5. Auth

### 🟡 Magic link flow untested this session
Sends real email via SMTP — never triggered live to confirm delivery works.

---

## Suggested priority order

1. ~~**Scheduler cron trigger**~~ — done.
2. **Tender-found notifications** (in-app row at minimum; email if cron lands first) — the second
   half of "passive discovery," otherwise a working cron just fills a table silently.
3. **Website batch rotation** (`last_scraped_at` + order-by-oldest) — cheap, unblocks real
   coverage of the uploaded website list.
4. **Data retention / cleanup** — needed now that cron is live and volume will actually grow.
5. **Extraction schema fields** (organization, category) — moderate effort, meaningfully better
   data quality.
6. Everything else — real gaps, lower urgency.

# GCG Scraper — Roadmap

> Actionable backlog ordered by impact. Execute top-to-bottom within each section.

---

## 🔴 P1 — High Impact, Execute First

### 1. ~~Deadline Alerts via Slack~~ ✅ Already implemented
`sendClosingRemindersJob` — daily cron at 06:00, configurable `reminder_window_days` (default 3), Slack cards with 🔴 urgency marker, `reminder_sent_at` dedup so a tender is only reminded once. Window is adjustable from the Settings → Retention & Timing panel.

---

### 2. ~~Source Health Dashboard~~ ✅ Done
`source_health` table (migration 0040). `run-source-scrape.ts` upserts after every done/error step with `consecutive_zero_runs` tracking. `SourceHealthPanel` in Settings shows each source with healthy/warning/error badge — warning at 2+ empty runs or >72h stale.

---

### 3. ~~Manual Tender Entry~~ ✅ Done
`POST /api/tenders` endpoint. `AddTenderModal` component (title, org, source URL, closing date, location, category, description). "Add tender" action in tenders page header. On success refreshes the table. Uses `tender_type = "Manual"` (user-supplied value or default).

---

### 4. ~~Cross-Source Deduplication~~ ✅ Already implemented
`insertTenderRows` (tenderRow.ts:163) already queries existing tenders by closing_date and filters out normalized title+date matches before upsert. `droppedAsDuplicate` is tracked in every job's `result_summary`.

---

## 🟡 P2 — Medium Impact

### 5. ~~Bid Outcome Tracking~~ ✅ Done
`bid_submitted_at` (date) and `bid_value` (numeric) columns added via migration 0041. PATCH `/api/tenders/[id]` accepts both fields. `PursuitPanel` shows a "Bid details" section when status is applied/won/lost. Overview has a "Bid Pipeline" card with submitted/won/lost counts, win rate, and total pipeline value.

---

### 6. ~~Tender Document Parsing~~ ✅ Done
`tender_documents` table (migration 0042). `parseTenderDocuments` helper calls Firecrawl `/v1/scrape` per PDF attachment URL, deduped by URL so re-runs are free. `parse-documents` step added to `run-source-scrape.ts` after insertion. `/api/tenders/[id]/documents` GET endpoint. Tender detail page fetches and renders parsed docs in an expandable accordion below Attachments.

---

### 7. ~~Per-User Notification Preferences~~ ✅ Done
`notification_preferences` table (migration 0043): per-user Slack/email toggle, source filter (tender_types[]), keyword filter. `NotificationPreferencesPanel` in Settings. `fanOutNotifications` added to `notify.ts` — runs after task-owner notification, skips task owner, filters by source + keyword match. Both `run-source-scrape` and `run-scrape` pass tenderType to notifyTaskOwner.

---

## 🟢 P3 — Credit Optimization

### 8. ~~Source-Specific Scrape Cadence~~ ✅ Done
`scrapeFrequencyHours` added to `SourceConfig`. PPIP/Treasury/GHANEPS/Tenderers KE = 72h; AfDB/World Bank = 48h; others default 24h. In `startTaskRun.ts`, before queuing a `tender-source` job, checks `source_health.last_run_at` — cancels the job and logs the skip if within cadence window.

---

### 9. ~~Extend Dedup Window for Slow Sources~~ ✅ Done
`dedupWindowDays` added to `SourceConfig`. PPIP/Treasury/GHANEPS/Tenderers KE = 21d; AfDB/World Bank = 14d; default 7d. `filter-recently-scraped` step added to `run-source-scrape.ts` using the per-source window. `urlsSkippedAsRecent` tracked in result_summary. `run-scrape.ts` (web search) unchanged at 7d.

---

### 10. ~~Skip Closed Tender Re-Scrapes~~ ✅ Done
New `filter-closed-tenders` step in `run-scrape.ts` — queries closed tenders by source_url and removes them from the extract list before the allowlist load. `urlsSkippedAsClosed` tracked in `result_summary`.

---

### 11. ~~Re-Extract from Cached Markdown~~ ✅ Done
`extractTendersFromMarkdown(markdown, prompt)` helper added to `firecrawlExtract.ts` — uses GROQ `llama-3.3-70b-versatile` with `response_format: json_object`. `check-cached-markdown` step in `run-source-scrape.ts` queries last 24h `raw_content` for this source; if found and GROQ is configured, skips the Firecrawl scrape call with graceful fallback on error.

---

### 12. ~~Per-Term Acceptance Rate (Search Jobs)~~ ✅ Done
`search_term_performance` table (migration 0044): runs, total_found, total_rejected per term. `update-term-performance` step in `run-scrape.ts` upserts after each run — multi-query runs attribute tenders by matched_keywords. `SearchTermPerformancePanel` in Settings/Keywords shows acceptance % with low-yield warning (⚠️ <20% over 5+ runs).

---

## 🔵 P4 — New Run Page Improvements

### 13. ~~Tender Source Mode in New Run~~ ✅ Done
"Tender Source" tab added to `RunModeSwitcher`. `TenderSourceRunForm` component: grid of all configured sources with last-run-at hint (⚠️ if <1h ago), source health stats inline. `POST /api/jobs/tender-source` fires `tenders/source.queued` directly, bypassing the cadence gate so ad-hoc runs always fire.

---

### 14. ~~Shared "Notify on Slack" Toggle Across All Modes~~ ✅ Done
`notifyOnCompletion` checkbox moved outside all mode `div`s — now sits below all forms and applies regardless of which mode is active.

---

### 15. ~~Recent Runs Panel Below Console~~ ✅ Done
`RecentRunsPanel` component below the console: last 5 jobs, mode icon, label, status badge, tender/lead count, relative time, links to results. Fetches `/api/jobs?limit=5` on mount and refreshes when the current job reaches `complete` or `error`.

---

## Done ✅
- [x] Multi-key Firecrawl rotation (12 keys)
- [x] URL deduplication (7-day window)
- [x] Rejected candidates page with GenericTable
- [x] Recover rejected tender + allowlist
- [x] Stat card links with date/pursuit filters
- [x] Cross-links between tenders ↔ rejected candidates
- [x] Muted chart palette
- [x] Proxy fix for /assets/* paths

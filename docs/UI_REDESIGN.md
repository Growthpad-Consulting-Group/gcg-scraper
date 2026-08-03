# GCG Tender Dashboard — UI Redesign Spec

This is a from-first-principles redesign, not a patch on the current pages. The current app
(`overview`, `tenders`, `leads`, `run-query`, `scheduler`, `keyword-manager`, `upload-website`)
is treated here only as the list of jobs-to-be-done — the visual language below is deliberately
new, modeled on how real scraper/data platforms present themselves.

---

## 1. What "professional scraper SaaS" actually looks like

Two products define the category and were used as direct reference points here:

**Apify Console** — the closest functional sibling (multi-source scraping + scheduled runs +
stored datasets). Its console is built around a **left rail with keyboard-shortcut navigation**
(`G`+`H` dashboard, `G`+`R` runs — press `Shift+?` for the full map), a **Dashboard landing page**
built from three panels (Recently viewed / Suggested / Runs — recent executions, scheduled ops,
saved tasks side by side), and dedicated first-class sections for **Runs**, **Schedules**, and
**Storage** rather than burying scrape history inside a generic table. The lesson: a scraping
tool's home page is a *run feed*, not a KPI wall — the product is fundamentally about "what ran,
what's running, what's scheduled next."

**Firecrawl** — the reference for how to make raw scraped output feel trustworthy and inspectable.
Its marketing/product surface leans hard on **terminal-style output framing**: `[ 200 OK ]`,
`[ .JSON ]`, `[ SCRAPE ]` badges, dark code panels with language tabs (Python/Node/cURL/CLI), and
numbered progressive sections. The lesson: don't hide the "this is scraped/structured data"
nature of the product — lean into monospace metadata, status-code-style badges, and raw/parsed
view toggles. It reads as more credible for a data tool than soft rounded SaaS chrome.

Neither product uses heavy gradients, playful illustration, or marketing-site styling inside the
authenticated app — both go flatter, denser, and more monospace/technical once you're past
login. **That's the biggest directional shift from the current app**: the login screen's warm
gradient-button, soft-card aesthetic is fine for the door, but the working app behind it should
feel more like a control room than a landing page.

---

## 2. Direction: "Control room," not "dashboard template"

Three principles, in priority order:

1. **Runs are the primary object, not tenders.** Every tender/lead row exists because a scrape
   run produced it. Surface the run lifecycle (queued → running → succeeded/failed, source,
   duration, item count) as a first-class nav item and as the Overview landing content —
   mirroring Apify's Runs/Schedules split — instead of only showing static result tables.
2. **Data is provably scraped, not manually entered.** Every tender/lead detail view should show
   its provenance: source site, scraped-at timestamp, raw vs. parsed toggle. Borrow Firecrawl's
   status-badge language (`[ NEW ]`, `[ CLOSING SOON ]`, `[ SOURCE: TENDERS.GO.KE ]`) rendered in
   monospace pill badges — this single move differentiates it from a generic CRUD admin panel.
3. **Power-user speed over decoration.** Command palette (`⌘K`) and keyboard shortcuts (`G`+letter
   pattern, exactly like Apify) for navigating between the 7 sections. A scraper tool's users run
   it daily — optimize for zero-mouse operation, not first-impression polish.

---

## 3. Visual system

### Palette — shift from "warm SaaS" to "technical, dark-capable"
Keep the brand orange as the *only* accent, drop it everywhere else. Base surfaces go neutral
gray/near-black rather than the current cream (`#fdfaf5`) — cream reads as consumer/lifestyle,
not data-tooling. Cream stays reserved for the public login screen only.

```
App shell (new):
  canvas:      #0b0c0e   (dark default)  /  #f7f7f8  (light)
  surface:     #131417            /  #ffffff
  surface-2:   #1a1c1f            /  #f1f1f3   (raised cards, terminal panels)
  border:      #26282c            /  #e4e4e7
  text-hi:     #f4f4f5            /  #18181b
  text-lo:     #8b8d93            /  #71717a

Brand accent (unchanged, used sparingly):
  brand-500: #f05d23   primary actions, active nav, focus ring
  brand-600: #d94f1e   hover

Status (terminal-badge style, monospace, uppercase):
  success: #22c55e   [ SUCCEEDED ] [ OPEN ]
  warning: #eab308   [ RUNNING ]   [ CLOSING SOON ]
  danger:  #ef4444   [ FAILED ]    [ CLOSED ]
  info:    #3b82f6   [ QUEUED ]    [ NEW ]
```

Default to **dark mode as the primary designed experience** (like Apify Console, like most
dev-facing SaaS), light mode as a supported toggle — not the other way around. This alone moves
the product out of "generic admin template" territory.

### Typography
- UI font: **Inter** or **Geist Sans**.
- Monospace font (**JetBrains Mono** or **Geist Mono**) for: run IDs, timestamps, source URLs,
  status badges, cron expressions, raw JSON/HTML preview panels. Mixing mono into a mostly
  sans-serif UI is exactly the Firecrawl move that signals "real data tool."

### Radius & density
Tighter than a typical marketing-adjacent SaaS: `rounded-md` (6px) default, `rounded-lg` (8px)
for cards/modals only. Denser row heights in tables (36–40px, not 56px) — this is a tool people
scan hundreds of rows in, not a leisurely content feed.

---

## 4. App shell

```
┌───────┬──────────────────────────────────────────────────────┐
│ ⌘K    │  Runs   Tenders   Leads   ···           🔔  ⚙  avatar │
│ rail  ├──────────────────────────────────────────────────────┤
│       │                                                        │
│ [G H] │   Content — dense, table/console-first                │
│ Home  │                                                        │
│ [G R] │                                                        │
│ Runs  │                                                        │
│ [G T] │                                                        │
│ Tndrs │                                                        │
│ [G L] │                                                        │
│ Leads │                                                        │
│ [G S] │                                                        │
│ Sched │                                                        │
│ [G K] │                                                        │
│ Kwrds │                                                        │
└───────┴──────────────────────────────────────────────────────┘
```

- **Icon-first collapsible rail** (`w-14` collapsed / `w-56` expanded), each item shows its `G`+
  letter shortcut on hover — direct lift from Apify's shortcut system, and genuinely useful given
  7 sections used daily.
- **⌘K command palette** is not optional here — search tenders/leads by name, jump to a run,
  trigger "Run Query" from anywhere. This is the single highest-leverage addition for a tool this
  shape.
- Topbar stays minimal: no page title repeated (the rail already shows active state) — instead
  contextual actions (Filter, New Query, Export) live top-right, notification bell, avatar.

---

## 5. Home = Run Feed (replaces "Overview")

Rebuilt around Apify's three-panel dashboard concept, adapted to this product's actual objects:

- **Left/main column — Run feed**: live-updating list of scrape runs (source, status badge,
  started-at in monospace relative time, item count found, duration). Running items show an
  animated progress indicator, not just a static "Running" label. Click through to a run detail
  page with a terminal-style log panel (dark, monospace, auto-scroll) — this is where Firecrawl's
  `[ 200 OK ]`-style status framing pays off directly.
- **Right rail — two stacked panels**: "Scheduled next" (upcoming Scheduler entries, human-
  readable recurrence) and "Recently viewed" (last tenders/leads opened) — same split Apify uses.
- **Top strip** (thin, not card-heavy): a handful of number+label stat chips — active sources,
  tenders found today, open runs — rendered as a single horizontal bar, not four heavy KPI cards.
  Keep it secondary to the run feed, not the hero of the page.

---

## 6. Data views (Tenders, Leads)

- Table rows are dense and monospace for metadata columns (source, scraped-at, ID); tender
  title/company stays in the sans-serif UI font — mixing the two per-row is what makes it read
  as "structured data," matching the Firecrawl raw/parsed aesthetic.
- Every row expandable inline (no full navigation) to a **raw/parsed toggle**: parsed view shows
  the clean fields, raw view shows the scraped source snippet/JSON in a dark monospace panel.
  This is a distinctive, on-brand feature for a scraper product that a generic CRUD table
  wouldn't have.
- Status and source as monospace uppercase pill badges (`[ OPEN ]`, `[ TENDERS.GO.KE ]`), colored
  per the status palette above — not soft rounded colored text.
- Toolbar: search, filter chips, saved views (a scraper tool's power users re-run the same
  filters daily — persist them).
- Bulk-select → slide-up action bar (export, tag, archive).

## 7. Run Query & Scheduler

- **Run Query** becomes a real console screen, not a form-then-toast: parameters on the left,
  a live terminal/log panel on the right that streams status once submitted (queued → running →
  item-by-item as they're found → done), matching the "watch it work" expectation set by every
  scraper tool in this category. Ties directly into the existing Inngest job pipeline
  (`/api/jobs`) — this is a rendering/streaming problem, not a new backend.
- **Scheduler**: list view with human-readable recurrence as primary text and cron as a
  monospace subtitle/tooltip, next-run countdown, run history inline per schedule (links back
  into the Run feed).

---

## 8. Keyword Manager & Upload Website

- Keyword Manager: tag/chip editors per category (base/closing/relevant), not raw list+form —
  type-to-add, click-to-remove, grouped in cards by category.
- Upload Website: treat as "add a source," styled consistently with how sources appear elsewhere
  (same badge language used in tender/lead source columns) — reinforces that it's plugging into
  the same run pipeline, not a disconnected utility page.

---

## 9. What to explicitly avoid carrying over

- The warm gradient/lift-on-hover button style from the current login screen, inside the app
  shell — keep it only for the public login/auth screens.
- Cream (`#fdfaf5`) as an app-wide background — reserve warmth for auth/marketing surfaces,
  go neutral dark/gray for the working product.
- Emoji icons in toasts/status (`⚠️ ✅ ❌`) — replace with the monospace status-badge language
  used everywhere else, for visual consistency.
- Four-corner soft KPI cards as the Overview hero — replace with the run-feed-first layout.

---

## 10. Build order

1. Design tokens (dark-first palette, mono + sans font pairing) in `tailwind.config.js`.
2. `AppShell` — collapsible icon rail with `G`+letter shortcuts, `⌘K` command palette.
3. Primitives: `Badge` (monospace status/source pills), `Button`, `Table` (dense, expandable
   rows), `LogPanel` (dark terminal-style, monospace, auto-scroll — reusable for run detail and
   Run Query streaming).
4. Rebuild Home as the Run Feed (biggest conceptual and visual change from current Overview).
5. Migrate Tenders/Leads to the dense table + raw/parsed toggle pattern.
6. Run Query → live console experience; Scheduler → human-readable list with inline run history.
7. Keyword Manager / Upload Website last — lowest usage frequency, straightforward chip-editor
   pattern once primitives exist.

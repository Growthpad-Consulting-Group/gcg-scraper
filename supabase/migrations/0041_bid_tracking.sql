-- Bid outcome tracking — extends the existing pursuit workflow (watching/applied/won/lost/passed)
-- with concrete bid data: when we submitted and how much we bid. Separate from pursuit_notes
-- (free text) since these are structured fields the Overview can aggregate into a win rate and
-- pipeline value. Both nullable — not every pursued tender reaches submission.
alter table tenders
  add column if not exists bid_submitted_at date,
  add column if not exists bid_value numeric;

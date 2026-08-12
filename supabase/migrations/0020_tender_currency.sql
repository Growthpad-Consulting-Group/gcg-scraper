-- Budget was always extracted as a bare number with currency explicitly stripped ("no currency
-- symbol") — confirmed live: a tender showing "Budget 30,000" here shows "USD 30,000" on its
-- actual source page, so the number alone is ambiguous across an app now spanning many
-- countries/currencies. Extraction now captures currency alongside the number instead of
-- discarding it.
alter table tenders add column if not exists currency text;

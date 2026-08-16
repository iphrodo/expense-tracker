## 1. Historical totals split by daily/non-daily

- [x] 1.1 Add a `categories` parameter to `computeHistoricalTotals` and split complete-month spend
      into daily vs. non-daily using `Category.isDaily`
- [x] 1.2 Add `nonDailyMonthlyAverageCents` to `HistoricalTotals` (non-daily total across complete
      months divided by the count of complete months)
- [x] 1.3 Update `AveragesView.tsx`'s call site to pass `categories`

## 2. Smarter month projection

- [x] 2.1 Add a `typicalNonDailyMonthlyCents` parameter (default `0`) to `computeMonthSummary`
- [x] 2.2 Replace `projectedCents` with `totalProjectedCents`, computed as `dailyCents +
      dailyRateCents * daysRemaining + max(nonDailyCents, typicalNonDailyMonthlyCents)`, collapsing
      to `totalCents` when `daysRemaining <= 0`
- [x] 2.3 Remove the now-unused `projectedCents` field and its call sites
- [x] 2.4 Wire `MonthView.tsx` to compute `historicalTotals` via `computeHistoricalTotals` and pass
      `historicalTotals.nonDailyMonthlyAverageCents` into `computeMonthSummary`

## 3. Remove the current-month run-rate card from Averages view

- [x] 3.1 Delete `computeDailyRunRate` and the `DailyRunRate` interface from `src/lib/averages.ts`
- [x] 3.2 Replace the "DAILY RUN-RATE" card in `AveragesView.tsx` with an all-time historical card:
      €/day and €/month averages, plus total spent and the covered date range/month count
- [x] 3.3 Confirm the existing per-category "Category averages" table and its `AverageExclusion`
      handling are untouched

## 4. Month view sidebar layout

- [x] 4.1 Remove the "Щоденні витрати (місяць)" row from the summary card
- [x] 4.2 Collapse "Щоденні витрати на 1 день" from a two-column grid item into a single compact
      label/value row
- [x] 4.3 Add the "Прогноз до кінця місяця (всього)" row showing `totalProjectedCents`

## 5. Tests and verification

- [x] 5.1 Update `averages.test.ts` for the new `computeHistoricalTotals` signature and
      `nonDailyMonthlyAverageCents` assertions
- [x] 5.2 Update `averages.test.ts` for the new `computeMonthSummary` projection formula (remaining
      days, typical non-daily floor, completed-month collapse)
- [x] 5.3 Remove the obsolete `computeDailyRunRate` test suite
- [x] 5.4 Run `vitest run` (81 tests passing) and `tsc --noEmit` (clean)
- [x] 5.5 Manually verify both views against seeded multi-month data on a local disposable
      Postgres/PostgREST backend (`scripts/test-db/`), confirming the projection and historical
      figures match hand-calculated expectations

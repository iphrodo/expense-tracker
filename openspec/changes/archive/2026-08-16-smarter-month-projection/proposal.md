## Why

The month view's full-month spend projection was a naive `totalCents / daysElapsed * daysInMonth`
extrapolation. Because it scaled the *entire* month total — including one-off, non-`isDaily`
purchases (rent, etc.) that had already fully landed — it wildly over-projected: a user who had
paid 1250 EUR of rent and 1124 EUR of daily spend by day 16 saw a "projected" total (4600 EUR) that
implied rent would somehow be paid multiple times. Separately, the averages view's headline card
only ever showed a partial-month run-rate for daily categories, which is of limited use once you
already have months of history — a true all-time average (and total spent) is more useful there.

## What Changes

- Month view: replaced the linear whole-total projection with a formula that only extrapolates the
  daily-category pace across the remaining days, and folds in non-daily spend as `max(already
  spent this month, typical monthly amount from history)` instead of re-scaling it — so booked
  one-off spend isn't multiplied, but a bill that historically lands but hasn't yet this month is
  still budgeted for.
- Month view: removed the redundant "Щоденні витрати (місяць)" row (the old daily-only projection)
  and made "Щоденні витрати на 1 день" a single compact row instead of a two-column grid, since the
  smarter total projection row now covers what that pairing was approximating.
- Averages view: replaced the "DAILY RUN-RATE" card (current-month-only, partial-month figures)
  with an all-time historical card — average spend per day and per month across every *completed*
  month, plus total spent and the date range/month count it covers. This calculation intentionally
  ignores per-category `AverageExclusion` records (unlike the existing per-category "Category
  averages" table, which still respects them) so it reflects the full, unfiltered spending picture.
- **BREAKING** (internal only, no persisted data affected): `computeDailyRunRate` and its
  `DailyRunRate` type were deleted from `src/lib/averages.ts`; `computeMonthSummary`'s
  `projectedCents` field was removed in favor of `totalProjectedCents`, and it now takes an
  additional `typicalNonDailyMonthlyCents` parameter.

## Capabilities

### Modified Capabilities
- `expense-analytics`: the month summary block's projection formula and row set change; the
  averages view's headline card changes from a current-month run-rate to all-time historical
  averages; two requirements that referenced the deleted daily-run-rate-in-averages feature by name
  are reworded to describe the current (unchanged) day-divisor and live-update behavior standalone.

## Impact

- `src/lib/averages.ts`: `computeMonthSummary` signature and return shape changed;
  `computeHistoricalTotals` gained a `categories` parameter and a `nonDailyMonthlyAverageCents`
  field; `computeDailyRunRate`/`DailyRunRate` removed.
- `src/lib/averages.test.ts`: updated/added unit tests for the above.
- `src/features/analytics/MonthView.tsx`: sidebar summary card layout and computed projection.
- `src/features/analytics/AveragesView.tsx`: headline card swapped from run-rate to historical
  totals.
- No database schema or migration changes; no persisted data is affected.

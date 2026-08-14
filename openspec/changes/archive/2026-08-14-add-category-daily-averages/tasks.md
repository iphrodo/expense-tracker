## 1. Averages computation

- [x] 1.1 In `src/lib/averages.ts`, add a `DETAIL_CATEGORY_GROUPS` list of `{ label,
      categoryNames }` groups: "тільки їжа" (`Іжа в закладі`, `Іжа на виніс`, `Продукти`) and
      "солодке+алк+чіпси" (`Солодке`, `Алкоголь`, `Снеки`).
- [x] 1.2 Add a `computeNamedCategoryDailyAverages(transactions, categories, month, now)` function
      that, for each group, finds the matching categories by exact name (any that exist), sums
      their transactions in `month` using signed `amountCents`, and divides by the day count for
      `month` — `now.getDate()` when `month` is the current month (same divisor as
      `computeDailyRunRate`), otherwise the full number of days in `month`. A group with no
      matching categories or transactions SHALL yield a `0` rather than throwing or producing
      `NaN`/`Infinity`.
- [x] 1.3 Add/extend unit tests in `src/lib/averages.test.ts` covering: normal case (multiple
      categories summed into one group), zero transactions in the selected month, no member
      categories present in the database, day-1-of-month divisor for the current month, a refund
      (negative amount) reducing the average, and the full-days-in-month divisor for a past month.

## 2. Month view UI

- [x] 2.1 In `src/features/analytics/MonthView.tsx`, compute the group rows via `useMemo` using
      `computeNamedCategoryDailyAverages(transactions, categories, month, new Date())`,
      re-deriving whenever the selected `month` changes.
- [x] 2.2 Add a "Детально" section as a right-hand sidebar (two-column layout: transaction list on
      the left, sidebar on the right), shown for whichever month is selected, rendering one row
      per group ("<label> за 1 день") with its per-day average formatted via `formatCents`,
      showing a dash for a zero/unavailable average, plus a "Разом" row summing the group
      averages.
- [x] 2.3 Manually verify in the running app: the two group rows and the total row appear in the
      right sidebar for the current month and for a past month, values match a manual spot-check
      against transaction data, and the section behaves correctly on day 1 of the current month
      and when a group has no transactions in the selected month.

## 3. Month summary block

- [x] 3.1 In `src/lib/averages.ts`, add a `computeMonthSummary(transactions, categories, month,
      now)` function returning `{ totalCents, nonDailyCents, dailyCents, dailyRateCents,
      projectedCents }` for the selected month, using the same day-divisor rules (days elapsed for
      the current month, full days-in-month for a past month) as
      `computeNamedCategoryDailyAverages`.
- [x] 3.2 Add unit tests in `src/lib/averages.test.ts` covering: splitting daily vs. non-daily
      totals, the full-days-in-month divisor and projection for a past month, and excluding
      transactions from other months.
- [x] 3.3 In `src/features/analytics/MonthView.tsx`, add a summary block above the "Детально"
      section in the same right sidebar, rendering "Всього", "Не щоденні витрати всього",
      "Щоденні витрати всього", "Щоденні витрати на 1 день", and "Щоденні витрати (місяць)" using
      `computeMonthSummary`.
- [x] 3.4 Manually verify in the running app: the summary block appears above "Детально" in the
      right sidebar for both the current month and a past month, and the projected-month figure
      uses the full month length rather than days elapsed.

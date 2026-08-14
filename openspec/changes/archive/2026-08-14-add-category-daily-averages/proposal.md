## Why

The averages view already shows an overall daily run-rate for `isDaily` categories, but the user
also wants to see, at a glance, the per-day average spend for two grouped spending buckets they
track closely — "food only" (dine-in, takeout, groceries) and "sweets+alcohol+snacks" — over the
days elapsed so far this month, matching a breakdown they previously maintained in a spreadsheet.

## What Changes

- Add a summary block to the month view's right sidebar, shown for whichever month is currently
  selected, with five rows:
  - "Всього": total of all transactions in the selected month
  - "Не щоденні витрати всього": total of transactions in non-`isDaily` categories
  - "Щоденні витрати всього": total of transactions in `isDaily` categories
  - "Щоденні витрати на 1 день": the daily-category total divided by the day count
  - "Щоденні витрати (місяць)": the per-day rate projected across the full number of days in the
    selected month
- Add a "Details" (Детально) section below that block, in the same right sidebar, listing a
  per-day average for two fixed category groups:
  - "тільки їжа" (food only): `Іжа в закладі` + `Іжа на виніс` + `Продукти`
  - "солодке+алк+чіпси" (sweets+alcohol+snacks): `Солодке` + `Алкоголь` + `Снеки`
- A "Разом" (total) row sums the two group averages.
- Every per-day figure (the summary block's rate/projection and each Детально group) uses the same
  day count: for the current month this is days elapsed so far (`now.getDate()`, inclusive of
  today, same divisor as the existing daily run-rate); for a past month this is the full number of
  days in that month. Amounts are signed (refunds included), never filtered or absoluted.
- A group whose member categories currently have zero matching transactions in the selected month
  displays a zero/dash average rather than being omitted or erroring.
- Category matching is by exact category name (case-sensitive), against categories that already
  exist in the database.

## Capabilities

### Modified Capabilities
- `expense-analytics`: adds a month summary block and a grouped-category daily-average detail
  section to the month view's sidebar, using the same day-divisor rules and signed-amount handling
  as the existing daily run-rate.

## Impact

- `src/lib/averages.ts`: new computation functions — one for the month summary block, one for
  per-group daily averages — both taking the selected month as a parameter.
- `src/features/analytics/MonthView.tsx`: new right-sidebar summary block and "Детально" section,
  for whichever month is selected.
- No schema or data-model changes; relies on existing `Category`/`Transaction` tables.

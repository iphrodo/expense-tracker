## MODIFIED Requirements

### Requirement: Month sidebar figures use a month-appropriate day divisor and signed-amount handling
For the current month, the summary block's daily rate and each Детально group's daily average
SHALL use a divisor of the number of days elapsed in the current month, including today
(`now.getDate()`). For a past month, the divisor SHALL be the total number of days in that month.
In all cases the underlying sums SHALL use transactions' signed amounts, including negative
(refund) transactions, without filtering or taking an absolute value.

#### Scenario: Divisor matches days elapsed including today, for the current month
- **WHEN** the selected month is the current month and today is the 1st
- **THEN** every group's daily average is computed with a divisor of 1, not 0

#### Scenario: Divisor is the full month length for a past month
- **WHEN** the selected month is a past month with 30 days
- **THEN** every group's daily average for that month is computed with a divisor of 30

#### Scenario: A refund reduces a group's daily average
- **WHEN** the "солодке+алк+чіпси" group has 500 EUR of ordinary spend and a -100 EUR refund in
  the selected month, and the divisor for that month is 10
- **THEN** the displayed "солодке+алк+чіпси" daily average is 40.00 EUR/day ((500 - 100) / 10)

### Requirement: Negative transactions are included arithmetically, never filtered or absoluted
A transaction with a negative amount (a refund or reimbursement recorded against its original
category) SHALL be included in month totals, category subtotals, per-category averages, the
summary block's daily rate, and the historical all-time averages using its signed value. The
system SHALL NOT filter negative transactions out of any of these computations and SHALL NOT
convert a negative amount to its absolute value before summing.

#### Scenario: A refund reduces the month total and category subtotal
- **WHEN** a category has transactions of 5078 and -2000 cents in the viewed month
- **THEN** the category subtotal for that month is 3078 cents, and the month total includes that
  same 3078 cents contribution — not 7078 cents

#### Scenario: A refund reduces a category's average
- **WHEN** category A has complete-month totals of 10000 cents in month 1 and 6000 cents in
  month 2, where month 2's total already includes a -2000 cent refund alongside 8000 cents of
  ordinary spend
- **THEN** category A's average is `(10000 + 6000) / 2` = 8000 cents/mo, reflecting the refund's
  reduction of month 2's total, with `monthsCounted` still 2

#### Scenario: A refund in an isDaily category reduces the daily run-rate
- **WHEN** `isDaily` categories total 150 EUR of ordinary spend and a -20 EUR refund so far in the
  current month, on day 10
- **THEN** the summary block's "Щоденні витрати на 1 день" displays 13.00 EUR/day
  ((150 - 20) / 10)

### Requirement: Analytics reflect writes without a reload
Creating, editing, or deleting a transaction — including via Undo — SHALL be reflected in the
month view (including its projection and Детально sections) and the averages view (including its
historical all-time card) without requiring the user to reload or manually refresh the app.

#### Scenario: An edit made from the month view updates the displayed total immediately
- **WHEN** the user edits a transaction's amount from the month view
- **THEN** the category subtotal and month total displayed update to reflect the new amount
  without a page reload

#### Scenario: A delete updates averages immediately
- **WHEN** the user deletes a transaction that contributed to a category's currently-displayed
  average
- **THEN** the averages view, if open, recomputes and displays the updated average without a page
  reload

## ADDED Requirements

### Requirement: Month summary block shows totals, daily rate, and a full-month projection
The month view SHALL provide a summary block in its right sidebar, shown for whichever month is
currently selected, with: "Всього" (total of all transactions in the selected month), "Не щоденні
витрати всього" (total of transactions in non-`isDaily` categories), "Щоденні витрати всього"
(total of transactions in `isDaily` categories), "Щоденні витрати на 1 день" (the daily-category
total divided by the day count for the selected month), and "Прогноз до кінця місяця (всього)" (a
projected full-month total computed per the "Month projection blends daily pace with typical
non-daily spend" requirement).

#### Scenario: Summary splits daily and non-daily totals
- **WHEN** the selected month has 800 EUR in `isDaily` categories and 300 EUR in non-`isDaily`
  categories
- **THEN** "Всього" displays 1100 EUR, "Щоденні витрати всього" displays 800 EUR, and "Не щоденні
  витрати всього" displays 300 EUR

### Requirement: Month projection blends daily pace with typical non-daily spend
For the currently selected month, the summary block's "Прогноз до кінця місяця (всього)" figure
SHALL be computed as: the `isDaily`-category total spent so far this month, plus the current daily
rate multiplied by the number of days remaining in the month, plus whichever is larger of (a) the
non-`isDaily` total spent so far this month or (b) the typical monthly non-`isDaily` spend
computed per the "Historical averages summarize all-time spend" requirement. For a month that has
already ended (no days remaining), the projection SHALL equal that month's actual total instead.

#### Scenario: Projection carries only the daily pace forward, not one-off spend already booked
- **WHEN** the selected month is the current month, 16 days have elapsed of 31, `isDaily`
  categories total 1124.38 EUR so far, and non-`isDaily` categories total 1250.05 EUR so far (already
  exceeding the typical monthly non-daily amount)
- **THEN** the projection equals 1124.38 + (1124.38 / 16) × 15 + 1250.05 EUR, not
  (1124.38 + 1250.05) / 16 × 31 EUR

#### Scenario: Projection budgets for a typical bill that has not landed yet this month
- **WHEN** the selected month is the current month, the typical monthly non-`isDaily` spend from
  history is 500 EUR, and only 50 EUR of non-`isDaily` spend has been recorded so far this month
- **THEN** the projection's non-daily component uses 500 EUR (the historical typical amount), not
  the 50 EUR spent so far

#### Scenario: Projection equals the actual total for a completed month
- **WHEN** the selected month is a past, completed month
- **THEN** "Прогноз до кінця місяця (всього)" displays the same value as "Всього" for that month

### Requirement: Historical averages summarize all-time spend
The averages view SHALL provide a card summarizing spend across every *complete* month (per the
"A month counts toward averages only if complete, in either direction" requirement): the average
spend per calendar day (total spend across complete months divided by the total number of days
those months span), the average spend per month (total spend divided by the count of complete
months), and the total amount spent together with the date range and count of complete months it
covers. This computation SHALL include every transaction in a complete month regardless of any
active `AverageExclusion` for that category-month — exclusions apply only to the existing
per-category "Category averages" table, not to this card.

#### Scenario: Card shows totals unaffected by active exclusions
- **WHEN** category A has an active `AverageExclusion` for a complete month, and that month's
  transactions for category A total 300 EUR
- **THEN** the historical card's total-spent figure still includes that 300 EUR, even though
  category A's row in "Category averages" excludes that month

#### Scenario: Per-day and per-month averages divide by the complete months' own spans
- **WHEN** the complete months are `2026-06` (30 days) and `2026-07` (31 days) with a combined
  total of 6100 EUR
- **THEN** the average per day is 6100 / 61 EUR, and the average per month is 6100 / 2 EUR

#### Scenario: No complete months yet
- **WHEN** no month is yet complete (e.g. a brand-new account)
- **THEN** the card displays zeroed averages and a zero total rather than dividing by zero or
  showing `NaN`/`Infinity`

## REMOVED Requirements

### Requirement: Month summary block appears in the month view's right sidebar
**Reason**: Replaced by "Month summary block shows totals, daily rate, and a full-month
projection", which drops the "Щоденні витрати (місяць)" row — a per-day rate scaled by the full
month length — in favor of "Прогноз до кінця місяця (всього)", a smarter projection defined by the
new "Month projection blends daily pace with typical non-daily spend" requirement. The scenario
"Projection uses the full month length regardless of days elapsed" no longer applies: that simple
rate-times-days-in-month scaling is exactly the naive approach the new projection replaces.
**Migration**: No data migration needed — this is a display-only change; no persisted fields are
affected.

### Requirement: Daily run-rate projects current-month spend
**Reason**: Replaced by "Historical averages summarize all-time spend" — a partial-month,
current-month-only run-rate in the averages view duplicated the month view's own daily-rate
figure and was less useful once months of history exist. The month view's own current-month daily
rate ("Щоденні витрати на 1 день") is unaffected and still exists.
**Migration**: No data migration needed — this is a display-only change. `AverageExclusion` and
`MonthFlag` records are unaffected.

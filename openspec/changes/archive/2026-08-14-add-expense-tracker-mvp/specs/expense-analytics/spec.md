## Purpose

Gives read-only visibility into recorded spending: what happened this month, what a category
typically costs per month, and how the current month's daily spend is trending — without ever
touching the write path that entry depends on.

## ADDED Requirements

### Requirement: Month view groups transactions by category with a total
The system SHALL provide a month view that lists every transaction recorded for a given month,
grouped by category, and SHALL show a total across all transactions in that month. The view
SHALL include transactions in categories that are excluded from averages for that month, and
SHALL visually mark such category-months as excluded rather than hiding them.

#### Scenario: All transactions appear regardless of exclusion
- **WHEN** a category has an active `AverageExclusion` for the viewed month and also has
  transactions recorded in that month
- **THEN** those transactions still appear in the month view, grouped under that category, marked
  as excluded, and included in the displayed category subtotal and month total

#### Scenario: Month total sums all recorded transactions
- **WHEN** the month view is opened for a month with N transactions across multiple categories
- **THEN** the displayed total equals the sum of all N transaction amounts, including excluded
  categories

### Requirement: Averages are computed with a per-category divisor
The averages view SHALL compute, for each category, an average monthly spend using a divisor
equal to the count of months that actually contributed data for that specific category — not a
single divisor shared across categories.

#### Scenario: Category with fewer active months uses a smaller divisor
- **WHEN** category A has non-excluded, complete-month data in 3 distinct months and category B
  has non-excluded, complete-month data in 9 distinct months, both within the same overall date
  range
- **THEN** category A's average is computed by dividing its total by 3, and category B's average
  is computed by dividing its total by 9

### Requirement: A month counts toward averages only if complete, in either direction
The system SHALL treat a month as complete, and eligible to contribute to averages, by default
only if `month < current month`. A `MonthFlag` for a given month SHALL override this default in
either direction: `isComplete: true` includes an otherwise-incomplete month (typically the current
month), and `isComplete: false` excludes an otherwise-complete past month (typically a partial
first tracked month that would skew every category's average). A `MonthFlag` set on a month SHALL
apply to every category at once, which distinguishes it from an `AverageExclusion`, which scopes
to a single category-month.

#### Scenario: Current month is excluded from averages by default
- **WHEN** the averages view is computed and no `MonthFlag` exists for the current month
- **THEN** transactions dated in the current month do not contribute to any category's average
  total or divisor

#### Scenario: MonthFlag can mark the current month complete
- **WHEN** a `MonthFlag` exists for the current month with `isComplete: true`
- **THEN** transactions dated in the current month DO contribute to averages for that computation

#### Scenario: MonthFlag can mark a past month incomplete, for every category
- **WHEN** a past month `2025-11` (before the current month) has transactions in 5 different
  categories, and a `MonthFlag` exists for `2025-11` with `isComplete: false`
- **THEN** none of those 5 categories' averages include `2025-11` in either their numerator or
  their `monthsCounted` divisor — the exclusion applies across all 5 categories from the single
  flag, unlike an `AverageExclusion`, which would require 5 separate category-scoped records to
  achieve the same effect

### Requirement: Average exclusions remove a category-month from both numerator and divisor
An `AverageExclusion` for a given `categoryId` and `month` SHALL remove that category-month's
transactions from the numerator (total spend) AND SHALL decrement the divisor (months counted)
for that category's average — never one without the other.

#### Scenario: Exclusion removes the month from the divisor, not just the total
- **WHEN** category A has complete-month data in 4 distinct months with a combined total of T,
  and an `AverageExclusion` exists for one of those 4 months
- **THEN** the average is computed as `(T - excluded month's total) / 3`, not
  `(T - excluded month's total) / 4`

### Requirement: Each average row displays months counted
Each row in the averages view SHALL display the number of months that contributed to that
category's average (`monthsCounted`) alongside the average value itself.

#### Scenario: One-off purchase is legible as a one-off
- **WHEN** a category has complete, non-excluded data in exactly 1 month, with a total of 347 EUR
- **THEN** the row displays an average of 347 €/mo alongside a `monthsCounted` value of 1

### Requirement: Division by zero is guarded when all months are excluded
When every complete month for a category has an active `AverageExclusion`, the system SHALL NOT
divide by zero and SHALL display the category as having no computable average (e.g. as
unavailable/dash) rather than crashing or showing `Infinity`/`NaN`.

#### Scenario: All months excluded yields no crash and no average value
- **WHEN** category A has complete-month data in 2 distinct months and both months have an active
  `AverageExclusion`
- **THEN** the averages view renders without error and shows category A with no numeric average
  (monthsCounted: 0)

### Requirement: Daily run-rate projects current-month spend
The system SHALL provide a daily run-rate figure computed as the sum of all transactions in
`isDaily` categories for the current month, divided by the number of days elapsed in the current
month (including today), and SHALL also display a projection of that run-rate to a full month
(run-rate × days in the current month).

#### Scenario: Run-rate divides by days elapsed, including today
- **WHEN** today is the 10th of a month and `isDaily` categories total 150 EUR in transactions so
  far this month
- **THEN** the displayed daily run-rate is 15.00 EUR/day (150 / 10)

#### Scenario: Projection scales run-rate to the full month
- **WHEN** the daily run-rate is 15.00 EUR/day and the current month has 30 days
- **THEN** the displayed full-month projection is 450.00 EUR (15.00 × 30)

### Requirement: Negative transactions are included arithmetically, never filtered or absoluted
A transaction with a negative amount (a refund or reimbursement recorded against its original
category) SHALL be included in month totals, category subtotals, per-category averages, and the
daily run-rate using its signed value. The system SHALL NOT filter negative transactions out of
any of these computations and SHALL NOT convert a negative amount to its absolute value before
summing.

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
- **THEN** the displayed daily run-rate is 13.00 EUR/day ((150 - 20) / 10)

### Requirement: MonthFlag is settable from the month view
The month view SHALL provide a control to set or change the `MonthFlag` for the viewed month,
alongside the per-category exclusion toggle, distinct from it.

#### Scenario: Setting a month incomplete from the month view
- **WHEN** the user, viewing a past month, sets its completeness control to incomplete
- **THEN** a `MonthFlag` for that month is created or updated with `isComplete: false`, and the
  averages view recomputes to exclude that month for every category

### Requirement: Analytics reflect writes without a reload
Creating, editing, or deleting a transaction — including via Undo — SHALL be reflected in the
month view, averages view, and daily run-rate without requiring the user to reload or manually
refresh the app.

#### Scenario: An edit made from the month view updates the displayed total immediately
- **WHEN** the user edits a transaction's amount from the month view
- **THEN** the category subtotal and month total displayed update to reflect the new amount
  without a page reload

#### Scenario: A delete updates averages immediately
- **WHEN** the user deletes a transaction that contributed to a category's currently-displayed
  average
- **THEN** the averages view, if open, recomputes and displays the updated average without a page
  reload

### Requirement: Exclusions are managed from the month view and listed in the averages view
Each category row in the month view SHALL include a toggle to create or remove an
`AverageExclusion` for that category and the viewed month, with an optional free-text reason. The
averages view SHALL list all currently active exclusions and SHALL allow removing any of them.

#### Scenario: Toggling exclusion from month view creates an AverageExclusion
- **WHEN** the user toggles exclusion on for category A in the month view for month `2026-06`,
  optionally entering a reason
- **THEN** an `AverageExclusion` record is created with `categoryId` = A, `month` = `2026-06`, and
  the given reason (if any), unique on `(categoryId, month)`

#### Scenario: Averages view lists and allows removing an active exclusion
- **WHEN** an `AverageExclusion` exists for category A and month `2026-06`
- **THEN** the averages view lists that exclusion, and the user can remove it, after which
  category A's average recomputes to include that month

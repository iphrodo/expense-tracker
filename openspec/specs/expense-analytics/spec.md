# expense-analytics Specification

## Purpose

Gives read-only visibility into recorded spending: what happened this month, what a category
typically costs per month, and how the current month's daily spend is trending — without ever
touching the write path that entry depends on.

## Requirements

### Requirement: Expense entry form appears at the top of the Month view's main content
The Month view's main content column SHALL render the expense entry form (amount, category
selector, date, optional note, save) as its first element, above the flat, date-grouped
transaction list, for whichever month is currently selected. The right sidebar (summary block,
"Детально", "По категоріях") SHALL be unaffected by this placement and SHALL continue to render
exactly as it did before the entry form was embedded.

#### Scenario: Entry form renders above the transaction list
- **WHEN** the Month view is rendered for any selected month
- **THEN** the expense entry form appears at the top of the main content column, and the flat
  transaction list for that month appears below it

#### Scenario: Sidebar is unchanged by the merge
- **WHEN** the Month view is rendered with the entry form embedded
- **THEN** the right sidebar still shows the summary block, "Детально" section, and "По
  категоріях" breakdown with the same content and behavior as before the entry form was added

#### Scenario: Entry form is independent of the selected month for its own date default
- **WHEN** the user has navigated the Month view to a past month and then saves a new transaction
  without changing the entry form's date field
- **THEN** the transaction is saved with the entry form's own date (defaulting to today per the
  expense-entry date-persistence requirement), not silently backdated to the month being viewed

### Requirement: Month view lists transactions in reverse-chronological order, grouped by date
The Month view's main content SHALL list every transaction recorded for the selected month as a
flat list sorted by date descending (most recent first), with transactions sharing the same date
sorted by a stable secondary key (e.g. id) so their relative order does not change between
renders. The list SHALL be visually grouped under date headers rather than category headers, and
SHALL show a total across all transactions in that month. Each date-group header SHALL also show
the total of that date group's own transactions, alongside the group's date.

#### Scenario: Transactions render newest date first
- **WHEN** the selected month has transactions dated `2026-08-04`, `2026-08-10`, and `2026-08-12`
- **THEN** the `2026-08-12` transactions render first, followed by `2026-08-10`, followed by
  `2026-08-04`

#### Scenario: List is grouped by date, not by category
- **WHEN** the selected month has transactions from multiple categories dated `2026-08-04`
- **THEN** those transactions appear together under a single `2026-08-04` date group, regardless
  of which categories they belong to

#### Scenario: Month total sums all recorded transactions
- **WHEN** the month view is opened for a month with N transactions across multiple categories
- **THEN** the displayed total equals the sum of all N transaction amounts, including transactions
  in excluded category-months

#### Scenario: Each row is tinted by its category's color
- **WHEN** the flat transaction list renders a transaction in category "Продукти"
- **THEN** that row's background remains the neutral surface color, and the category is identified
  by a filled marker dot in "Продукти"'s `dot` color, placed beside the category name, plus the
  category name itself

#### Scenario: Clicking a row opens the edit panel
- **WHEN** the user clicks a transaction row in the flat list
- **THEN** the transaction edit panel opens for that transaction, same as clicking a row did in the
  previous category-grouped list

#### Scenario: Date-group header shows the group's own total
- **WHEN** a date group for `2026-08-14` contains transactions totaling 203.89 EUR
- **THEN** the header for that date group displays `203.89` alongside the `2026-08-14` date label

### Requirement: Excluded category-months remain visible in the flat transaction list
Transactions belonging to a category-month with an active `AverageExclusion` SHALL still appear in
the flat transaction list, in their normal date position, rather than being hidden or moved.

#### Scenario: Excluded category's transactions still appear in date order
- **WHEN** category A has an active `AverageExclusion` for the viewed month and also has a
  transaction dated `2026-08-10` in that month
- **THEN** that transaction still appears in the flat list under the `2026-08-10` date group,
  included in the month total

### Requirement: Averages are computed with a per-category divisor
The averages view SHALL compute, for each ordinary category, an average monthly spend using a
divisor equal to the count of complete months that contributed to that specific category after
category-average exclusions. For the exact category name `Техніка`, the system SHALL instead
spread its eligible signed spend over a fixed five-year lifetime of 60 months. This equipment
exception SHALL NOT change any other category's divisor.

#### Scenario: Category with fewer active months uses a smaller divisor
- **WHEN** ordinary category A has non-excluded, complete-month data in 3 distinct months and
  ordinary category B has non-excluded, complete-month data in 9 distinct months, both within the
  same overall date range
- **THEN** category A's average is computed by dividing its total by 3, and category B's average
  is computed by dividing its total by 9

#### Scenario: Equipment spend is spread over five years
- **WHEN** `Техніка` has 1,140 EUR of eligible signed spend in complete, non-excluded months
- **THEN** its monthly average is 19 EUR, calculated as 1,140 / 60, regardless of the shorter
  number of months currently tracked

#### Scenario: Equipment refunds reduce the smoothed average
- **WHEN** `Техніка` has 1,200 EUR of purchases and a -60 EUR refund in eligible complete months
- **THEN** its monthly average is calculated from the signed 1,140 EUR remainder and equals 19 EUR

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

### Requirement: Each average row displays its average divisor
Each row in the averages view SHALL display the divisor used for that category's average alongside
the average value. For ordinary categories this SHALL be the category's complete, non-excluded
`monthsCounted`; for `Техніка` it SHALL be the fixed 60-month lifetime.

#### Scenario: One-off ordinary purchase is legible as a one-off
- **WHEN** an ordinary category has complete, non-excluded data in exactly 1 month, with a total of
  347 EUR
- **THEN** the row displays an average of 347 EUR/month alongside a divisor of 1 month

#### Scenario: Equipment row communicates lifetime smoothing
- **WHEN** the averages view displays a numeric monthly average for `Техніка`
- **THEN** the row displays a divisor of 60 months alongside that average

### Requirement: Division by zero is guarded when all months are excluded
When every complete month for a category has an active `AverageExclusion`, the system SHALL NOT
divide by zero and SHALL display the category as having no computable average (e.g. as
unavailable/dash) rather than crashing or showing `Infinity`/`NaN`.

#### Scenario: All months excluded yields no crash and no average value
- **WHEN** category A has complete-month data in 2 distinct months and both months have an active
  `AverageExclusion`
- **THEN** the averages view renders without error and shows category A with no numeric average
  (monthsCounted: 0)

### Requirement: Category averages show actual complete-period spend
Each category row in the averages view SHALL show a total equal to the signed sum of all of that
category's transactions in complete months. An `AverageExclusion` SHALL NOT remove transactions
from this period total, even though it continues to affect the category's monthly average. A
category with transactions in the period SHALL remain visible when all of its complete months are
excluded from the average.

#### Scenario: Period total ignores a category-average exclusion
- **WHEN** a category has four complete months totaling 400 EUR and one 100 EUR category-month is
  excluded from its monthly average
- **THEN** its row displays a period total of 400 EUR while its average numerator contains 300 EUR

#### Scenario: Fully excluded category remains visible
- **WHEN** every complete month for a category is excluded from its average
- **THEN** the category remains in the averages table with its actual period total and no numeric
  monthly average

### Requirement: Averages provide a separate combined food summary
The averages view SHALL display a separate `Харчування` summary for the exact category names
`Продукти`, `Іжа в закладі`, `Іжа на виніс`, `Алкоголь`, `Снеки`, and `Солодке`. Its period total
SHALL equal the sum of those categories' exclusion-independent period totals. Its monthly average
SHALL equal the sum of their individually computed, exclusion-aware monthly averages and SHALL
exclude categories outside that exact set.

#### Scenario: Food total includes excluded category-month spend
- **WHEN** the six food categories have a combined complete-period total of 3,000 EUR, including
  200 EUR in a category-month excluded from averages
- **THEN** the `Харчування` total displays 3,000 EUR

#### Scenario: Food monthly average composes category averages
- **WHEN** the six food category rows have monthly averages of 100, 80, 70, 20, 15, and 25 EUR
- **THEN** the `Харчування` monthly average displays 310 EUR

#### Scenario: Non-food categories are not included
- **WHEN** `Транспорт` or `Техніка` has complete-period spending
- **THEN** that spending contributes to neither value in the `Харчування` summary

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

### Requirement: MonthFlag is settable from the month view
The month view SHALL provide a control to set or change the `MonthFlag` for the viewed month,
alongside the per-category exclusion toggle, distinct from it.

#### Scenario: Setting a month incomplete from the month view
- **WHEN** the user, viewing a past month, sets its completeness control to incomplete
- **THEN** a `MonthFlag` for that month is created or updated with `isComplete: false`, and the
  averages view recomputes to exclude that month for every category

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

### Requirement: Exclusions are managed from the month view's sidebar breakdown, with a confirmation dialog
Each category row in the "По категоріях" sidebar breakdown SHALL include an icon-button to create
or remove an `AverageExclusion` for that category and the viewed month. Clicking it SHALL open a
confirmation dialog with a free-text reason field rather than applying the change immediately. The
main transaction list SHALL NOT provide its own exclude/include control. The averages view SHALL
continue to list all currently active exclusions and SHALL allow removing any of them.

#### Scenario: Exclude icon opens a confirmation dialog
- **WHEN** the user clicks the exclude icon on a not-yet-excluded category row in the "По
  категоріях" breakdown for month `2026-06`
- **THEN** a confirmation dialog opens with an empty reason field, and no `AverageExclusion` is
  created until the user confirms

#### Scenario: Confirming exclude creates an AverageExclusion with the entered reason
- **WHEN** the user, in the exclude confirmation dialog for category A and month `2026-06`, enters
  a reason and confirms
- **THEN** an `AverageExclusion` record is created with `categoryId` = A, `month` = `2026-06`, and
  the entered reason, unique on `(categoryId, month)`

#### Scenario: Include icon opens a confirmation dialog pre-filled with the existing reason
- **WHEN** the user clicks the include icon on an already-excluded category row for category A and
  month `2026-06`, where the active `AverageExclusion` has reason "one-time bulk purchase"
- **THEN** a confirmation dialog opens showing "one-time bulk purchase" in the reason field, and
  the `AverageExclusion` is not removed until the user confirms

#### Scenario: Confirming include removes the AverageExclusion
- **WHEN** the user confirms the include dialog for category A and month `2026-06`
- **THEN** the `AverageExclusion` for `(A, 2026-06)` is removed and category A's average
  recomputes to include that month

#### Scenario: Dismissing the dialog makes no change
- **WHEN** the user opens either the exclude or include confirmation dialog and then closes it
  without confirming (e.g. via a cancel action)
- **THEN** no `AverageExclusion` is created, modified, or removed

#### Scenario: Main transaction list has no exclude control
- **WHEN** the flat transaction list is rendered for any month
- **THEN** no row or grouping in that list offers an exclude/include control; exclusion is only
  reachable from the "По категоріях" sidebar breakdown

#### Scenario: Averages view lists and allows removing an active exclusion
- **WHEN** an `AverageExclusion` exists for category A and month `2026-06`
- **THEN** the averages view lists that exclusion, and the user can remove it, after which
  category A's average recomputes to include that month

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

### Requirement: Grouped-category daily averages appear in the month view's right sidebar
The month view SHALL provide a "Детально" (details) section in its right sidebar, shown for
whichever month is currently selected, listing for two fixed category groups — "тільки їжа"
(`Іжа в закладі`, `Іжа на виніс`, `Продукти`) and "солодке+алк+чіпси" (`Солодке`, `Алкоголь`,
`Снеки`) — the average daily spend for that group in the selected month, plus a "Разом" row
summing the two group averages. Category matching SHALL be by exact (case-sensitive) name against
categories already present in the database.

#### Scenario: Group has transactions in the selected month
- **WHEN** the selected month is the current month, today is the 14th, and the categories
  `Іжа в закладі`, `Іжа на виніс`, and `Продукти` together have transactions totaling 700 EUR
  dated in that month
- **THEN** the details section displays a "тільки їжа" row with an average of 50.00 EUR/day
  (700 / 14)

#### Scenario: Group has no transactions in the selected month
- **WHEN** none of `Солодке`, `Алкоголь`, or `Снеки` has transactions dated in the selected month
- **THEN** the details section displays a "солодке+алк+чіпси" row with a zero or dash average, not
  an omitted row, an error, or `NaN`/`Infinity`

#### Scenario: None of a group's categories exist in the database
- **WHEN** none of a group's member category names exist in the database
- **THEN** the details section still displays that group's row with a zero or dash average

#### Scenario: Total row sums both group averages
- **WHEN** "тільки їжа" is 46.77 EUR/day and "солодке+алк+чіпси" is 3.30 EUR/day for the selected
  month
- **THEN** the "Разом" row displays 50.07 EUR/day

#### Scenario: Details section shown for a past month
- **WHEN** the user selects a month other than the current month
- **THEN** the details section still appears in the right sidebar with rows for the selected
  month, not hidden or limited to the current month

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

### Requirement: Per-category breakdown appears in the month view's right sidebar
The month view SHALL provide a per-category breakdown block in its right sidebar, shown for
whichever month is currently selected, in addition to the existing summary and Детально blocks.
The block SHALL list every category with at least one transaction in the selected month, split
into two sections — "Щоденні витрати" for categories where `isDaily` is `true`, and "Не щоденні
витрати" for categories where `isDaily` is `false` — with each row showing the category's name and
its signed sum of transactions for the selected month. A category with no transactions in the
selected month SHALL be omitted from the block rather than shown with a zero row.

#### Scenario: Categories split into daily and non-daily sections
- **WHEN** the selected month has transactions in category "Продукти" (`isDaily: true`) totaling
  223.38 EUR and in category "Квартира" (`isDaily: false`) totaling 644.28 EUR
- **THEN** "Продукти" appears as a row under "Щоденні витрати" showing 223.38 EUR, and "Квартира"
  appears as a row under "Не щоденні витрати" showing 644.28 EUR

#### Scenario: Category with no transactions in the selected month is omitted
- **WHEN** a category exists in the database but has no transactions dated in the selected month
- **THEN** that category does not appear as a row in the breakdown block for that month

### Requirement: Categories within a section are sorted by name
Within each section of the per-category breakdown block, categories SHALL be sorted by descending
signed amount for the selected month by default. The breakdown block SHALL provide a sort toggle
that switches a section's ordering to ascending alphabetical (`A–Z`) by category name; this toggle
SHALL NOT change the default ordering applied when the view is first opened.

#### Scenario: Sections default to highest-spend-first
- **WHEN** the "Щоденні витрати" section has transactions in categories "Такci" (192.51 EUR),
  "Продукти" (234.14 EUR), and "Їжа в закладі" (378.69 EUR) for the selected month
- **THEN** the rows appear in the order "Їжа в закладі", "Продукти", "Такci" by default

#### Scenario: A–Z toggle switches to alphabetical order
- **WHEN** the user activates the `A–Z` sort toggle for a section currently sorted by amount
- **THEN** that section's rows re-order to ascending alphabetical order by category name

#### Scenario: Toggle does not change the view's default on next open
- **WHEN** the user switches a section to `A–Z` and then reopens or reloads the month view
- **THEN** that section is shown sorted by descending amount again, not still on `A–Z`

### Requirement: Breakdown section totals match the summary block's daily/non-daily totals
Each section in the per-category breakdown block SHALL display a section total, and that total
SHALL equal the corresponding "Щоденні витрати всього" or "Не щоденні витрати всього" figure
already shown in the month view's summary block for the same selected month — computed from the
same underlying per-category sums, not recomputed independently.

#### Scenario: Daily section total matches the summary block
- **WHEN** the summary block shows "Щоденні витрати всього" as 800 EUR for the selected month
- **THEN** the "Щоденні витрати" section of the breakdown block shows a section total of 800 EUR,
  and that total equals the sum of all rows shown in that section

#### Scenario: Non-daily section total matches the summary block
- **WHEN** the summary block shows "Не щоденні витрати всього" as 300 EUR for the selected month
- **THEN** the "Не щоденні витрати" section of the breakdown block shows a section total of
  300 EUR, and that total equals the sum of all rows shown in that section

### Requirement: Breakdown rows use signed amounts, including refunds
Each category row and section total in the per-category breakdown block SHALL use transactions'
signed amounts for the selected month, including negative (refund) transactions, without filtering
them out or taking an absolute value — consistent with how the summary and Детально blocks already
handle signed amounts.

#### Scenario: A refund reduces a category's displayed row sum
- **WHEN** category "Такci" has transactions of 220 EUR and -27.49 EUR in the selected month
- **THEN** the "Такci" row in the breakdown block displays 192.51 EUR, not 220.00 EUR

### Requirement: Each category row has a deterministic display color
Each category — wherever it is rendered with color across the system, including the per-category
breakdown block, the main transaction list's identity dot, and the entry form's chips and search —
SHALL derive its `dot`, `tint`, and `text` presentation roles from that category's fixed
deterministic hue assignment, so the same category always renders with the same three roles across
renders and across sessions, without requiring any per-category color configuration to be stored or
edited by the user. The palette of hues underlying this assignment SHALL order its hues so that any
two categories assigned adjacent positions have visually distinct hues, rather than a continuous
hue progression that makes neighboring categories hard to tell apart at a glance. In the
per-category breakdown block, each row's proportional bar (representing that category's share of
its section's total) SHALL be rendered in the category's `dot` color at full share and the
unfilled portion of the bar SHALL be rendered in the neutral track color, not the category's color.

#### Scenario: Same category renders with the same color across months
- **WHEN** category "Продукти" is displayed in the breakdown block for two different selected
  months
- **THEN** its `dot`, `tint`, and `text` roles are identical in both cases

#### Scenario: A newly created category still gets a color with no configuration
- **WHEN** a category is created that has never been assigned a color by any user action
- **THEN** its row in the breakdown block still renders with `dot`/`tint`/`text` roles drawn from
  the fixed palette, not left uncolored or erroring

#### Scenario: Adjacent categories in palette order are visually distinct
- **WHEN** two categories are assigned adjacent positions in the palette (e.g. palette indices 2
  and 3)
- **THEN** the two categories' `dot` colors are drawn from visually distinct hue families rather
  than two shades of the same or a neighboring hue

#### Scenario: Same category shows the same color in the entry form and the sidebar
- **WHEN** category "Продукти" is displayed both as a quick-access chip in the entry form and as a
  row in the sidebar breakdown block
- **THEN** both renderings use the same `dot`/`tint`/`text` roles for that category

#### Scenario: Same category shows the same color in the main transaction list
- **WHEN** category "Продукти" is displayed both as a row's identity dot in the main transaction
  list and as a row in the sidebar breakdown block
- **THEN** both renderings use the same `dot` color for that category

#### Scenario: Breakdown bar's filled portion uses the category's dot color
- **WHEN** a category's breakdown row shows a proportional bar for a 62% share of its section
- **THEN** 62% of the bar's width is filled in that category's `dot` color and the remaining 38% is
  rendered in the neutral track color
</content>

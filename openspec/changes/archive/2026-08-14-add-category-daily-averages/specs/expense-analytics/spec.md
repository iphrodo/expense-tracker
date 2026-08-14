## ADDED Requirements

### Requirement: Month summary block appears in the month view's right sidebar
The month view SHALL provide a summary block in its right sidebar, shown for whichever month is
currently selected, with five rows: "Всього" (total of all transactions in the selected month),
"Не щоденні витрати всього" (total of transactions in non-`isDaily` categories), "Щоденні витрати
всього" (total of transactions in `isDaily` categories), "Щоденні витрати на 1 день" (the
daily-category total divided by the day count for the selected month), and "Щоденні витрати
(місяць)" (the per-day rate projected across the full number of days in the selected month).

#### Scenario: Summary splits daily and non-daily totals
- **WHEN** the selected month has 800 EUR in `isDaily` categories and 300 EUR in non-`isDaily`
  categories
- **THEN** "Всього" displays 1100 EUR, "Щоденні витрати всього" displays 800 EUR, and "Не щоденні
  витрати всього" displays 300 EUR

#### Scenario: Projection uses the full month length regardless of days elapsed
- **WHEN** the daily rate for the selected month is 76.69 EUR/day and that month has 31 days
- **THEN** "Щоденні витрати (місяць)" displays 2377.39 EUR (76.69 × 31)

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
SHALL use the same day divisor as the existing daily run-rate — the number of days elapsed in the
current month, including today (`now.getDate()`). For a past month, the divisor SHALL be the total
number of days in that month. In all cases the underlying sums SHALL use transactions' signed
amounts, including negative (refund) transactions, without filtering or taking an absolute value.

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

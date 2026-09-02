## ADDED Requirements

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

## MODIFIED Requirements

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

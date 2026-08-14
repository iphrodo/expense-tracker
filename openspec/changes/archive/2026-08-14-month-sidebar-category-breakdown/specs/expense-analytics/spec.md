## ADDED Requirements

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

#### Scenario: Categories within a section are sorted by name
- **WHEN** the "Щоденні витрати" section has transactions in categories "Такci", "Продукти", and
  "Алкоголь" for the selected month
- **THEN** the rows appear in the same name-sorted order already used for categories elsewhere in
  the month view

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
Each category row in the per-category breakdown block SHALL be rendered with a background or
accent color drawn from a fixed palette and deterministically derived from the category, so the
same category always renders with the same color across renders and across sessions, without
requiring any per-category color configuration to be stored or edited by the user.

#### Scenario: Same category renders with the same color across months
- **WHEN** category "Продукти" is displayed in the breakdown block for two different selected
  months
- **THEN** its row is rendered with the same color in both cases

#### Scenario: A newly created category still gets a color with no configuration
- **WHEN** a category is created that has never been assigned a color by any user action
- **THEN** its row in the breakdown block still renders with a color drawn from the fixed palette,
  not left uncolored or erroring

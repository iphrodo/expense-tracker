## MODIFIED Requirements

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

### Requirement: Each category row has a deterministic display color
Each category row in the per-category breakdown block SHALL be rendered with a background or
accent color drawn from a fixed palette and deterministically derived from the category, so the
same category always renders with the same color across renders and across sessions, without
requiring any per-category color configuration to be stored or edited by the user. The palette
SHALL order its colors so that any two categories assigned adjacent positions in that palette
have visually distinct hues, rather than ordering colors as a continuous hue progression (e.g.
consecutive same-family shades like amber/yellow/lime) that makes neighboring categories hard to
tell apart at a glance. Any other part of the system that renders a category with a color (such as
the entry form's category chips and search, and each row of the main transaction list) SHALL use
this same color mapping, so a given category always displays with the same color everywhere it
appears colored.

#### Scenario: Same category renders with the same color across months
- **WHEN** category "Продукти" is displayed in the breakdown block for two different selected
  months
- **THEN** its row is rendered with the same color in both cases

#### Scenario: A newly created category still gets a color with no configuration
- **WHEN** a category is created that has never been assigned a color by any user action
- **THEN** its row in the breakdown block still renders with a color drawn from the fixed palette,
  not left uncolored or erroring

#### Scenario: Adjacent categories in palette order are visually distinct
- **WHEN** two categories are assigned adjacent positions in the palette (e.g. palette indices 2
  and 3)
- **THEN** the two colors are drawn from visually distinct hue families rather than two shades of
  the same or a neighboring hue

#### Scenario: Same category shows the same color in the entry form and the sidebar
- **WHEN** category "Продукти" is displayed both as a quick-access chip in the entry form and as a
  row in the sidebar breakdown block
- **THEN** both renderings use the same color from the palette

#### Scenario: Same category shows the same color in the main transaction list
- **WHEN** category "Продукти" is displayed both as a row in the main transaction list and as a
  row in the sidebar breakdown block
- **THEN** both renderings use the same color from the palette

## REMOVED Requirements

### Requirement: Month view groups transactions by category with a total
**Reason**: Replaced by a flat, reverse-chronological transaction list so the most recently
entered transactions are visible without scrolling through category cards; see the new
requirements "Month view lists transactions in reverse-chronological order, grouped by date" and
"Excluded category-months remain visible in the flat transaction list".
**Migration**: No data migration needed — this is a display-only change. The month total
computation is unchanged; only its presentation moves from per-category subtotaled cards to a
flat list with date-group headers.

## ADDED Requirements

### Requirement: Month view lists transactions in reverse-chronological order, grouped by date
The Month view's main content SHALL list every transaction recorded for the selected month as a
flat list sorted by date descending (most recent first), with transactions sharing the same date
sorted by a stable secondary key (e.g. id) so their relative order does not change between
renders. The list SHALL be visually grouped under date headers rather than category headers, and
SHALL show a total across all transactions in that month.

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
- **THEN** that row is rendered using the same deterministic color assigned to "Продукти" in the
  "По категоріях" sidebar breakdown

#### Scenario: Clicking a row opens the edit panel
- **WHEN** the user clicks a transaction row in the flat list
- **THEN** the transaction edit panel opens for that transaction, same as clicking a row did in the
  previous category-grouped list

### Requirement: Excluded category-months remain visible in the flat transaction list
Transactions belonging to a category-month with an active `AverageExclusion` SHALL still appear in
the flat transaction list, in their normal date position, rather than being hidden or moved.

#### Scenario: Excluded category's transactions still appear in date order
- **WHEN** category A has an active `AverageExclusion` for the viewed month and also has a
  transaction dated `2026-08-10` in that month
- **THEN** that transaction still appears in the flat list under the `2026-08-10` date group,
  included in the month total

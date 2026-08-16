## MODIFIED Requirements

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

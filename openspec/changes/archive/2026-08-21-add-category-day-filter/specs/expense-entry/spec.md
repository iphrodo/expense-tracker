## ADDED Requirements

### Requirement: Transaction list can be filtered to a single category by day
The Month view SHALL offer a compact category filter control (occupying no more vertical space
than a single row of chips or a closed dropdown) positioned near the day-grouped transaction list.
The control SHALL list only categories that have at least one transaction in the currently
displayed month. When the user selects a category from the control:

- Only day groups containing at least one transaction in the selected category SHALL be
  rendered; day groups with no transaction in that category SHALL be hidden entirely.
- Within each rendered day group, only transactions in the selected category SHALL be shown;
  transactions in other categories on that same day SHALL be hidden.
- Each rendered day group's displayed total SHALL reflect only the selected category's
  transactions for that day, not the day's full total.
- The month's overall total (displayed separately from the day list) SHALL remain unaffected by
  the filter and continue to reflect all transactions in the month.

When no category is selected, or the filter is cleared, the day-grouped transaction list SHALL
render exactly as it does with no filter applied: all days with any transaction in the month, and
every transaction within each day.

Switching the selected month WHILE a category filter is active SHALL keep the same category
selected and re-apply it to the newly displayed month's transactions. If the selected category has
no transactions in the newly displayed month, the list SHALL show no day groups (an empty
filtered state), not fall back to showing all categories.

#### Scenario: Selecting a category narrows days and transactions shown
- **WHEN** the displayed month has transactions in categories "Coffee" and "Groceries" across
  several days, and the user selects "Coffee" in the filter control
- **THEN** only the days that had at least one "Coffee" transaction remain visible, and within
  each of those days only the "Coffee" transactions are listed — no "Groceries" transactions or
  day groups appear

#### Scenario: Filtered day total reflects only the selected category
- **WHEN** a day has one "Coffee" transaction of 350 cents and one "Groceries" transaction of
  1200 cents, and the user has filtered to "Coffee"
- **THEN** that day group's displayed total is 350 cents, not 1550 cents

#### Scenario: Clearing the filter restores the full list
- **WHEN** a category filter is active and the user clears the selection
- **THEN** the day-grouped list immediately shows all days and all transactions for the displayed
  month, identical to the unfiltered state

#### Scenario: Filter control stays compact when no category is selected
- **WHEN** the Month view renders with no category filter selected
- **THEN** the filter control occupies no more than a single row of height near the transaction
  list, without pushing the list or the entry form down by more than that one row

#### Scenario: A category with zero transactions this month is not offered
- **WHEN** the displayed month has no transactions in category "Travel"
- **THEN** "Travel" does not appear as an option in the filter control for that month

#### Scenario: Switching months keeps the active filter applied
- **WHEN** a category filter is active for the currently displayed month and the user switches to
  a different month via the month picker
- **THEN** the same category remains selected and the newly displayed month's day list is
  filtered to that category

#### Scenario: Filtered category has no transactions in a newly selected month
- **WHEN** the filter is set to "Coffee" and the user switches to a month with no "Coffee"
  transactions
- **THEN** the day list shows no day groups for that month, rather than reverting to show all
  categories

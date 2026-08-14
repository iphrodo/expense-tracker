## ADDED Requirements

### Requirement: Expense entry form appears at the top of the Month view's main content
The Month view's main content column SHALL render the expense entry form (amount, category
selector, date, optional note, save) as its first element, above the category-grouped transaction
list, for whichever month is currently selected. The right sidebar (summary block, "Детально",
"По категоріях") SHALL be unaffected by this placement and SHALL continue to render exactly as it
did before the entry form was embedded.

#### Scenario: Entry form renders above the transaction list
- **WHEN** the Month view is rendered for any selected month
- **THEN** the expense entry form appears at the top of the main content column, and the
  category-grouped transaction list for that month appears below it

#### Scenario: Sidebar is unchanged by the merge
- **WHEN** the Month view is rendered with the entry form embedded
- **THEN** the right sidebar still shows the summary block, "Детально" section, and "По
  категоріях" breakdown with the same content and behavior as before the entry form was added

#### Scenario: Entry form is independent of the selected month for its own date default
- **WHEN** the user has navigated the Month view to a past month and then saves a new transaction
  without changing the entry form's date field
- **THEN** the transaction is saved with the entry form's own date (defaulting to today per the
  expense-entry date-persistence requirement), not silently backdated to the month being viewed

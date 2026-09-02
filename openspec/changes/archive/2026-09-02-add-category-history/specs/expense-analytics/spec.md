## ADDED Requirements

### Requirement: Category history is available as a top-level analytics destination

The application SHALL provide a top-level History destination on desktop and mobile that opens a
category-first historical view. Opening this destination SHALL NOT change the application's default
startup destination, which remains the Month view. Its visible mobile label SHALL be `Історія`.

#### Scenario: User opens category history directly

- **WHEN** the user selects `History` in the primary navigation
- **THEN** the application shows the category-history screen without requiring a month to be
  selected first

#### Scenario: Month remains the startup screen

- **WHEN** the application starts a new session
- **THEN** the Month view is selected by default rather than History

### Requirement: Mobile primary navigation remains compact after adding History

At mobile breakpoints, the application SHALL render exactly four persistent bottom-navigation
items: `Місяць`, `Історія`, `Середні`, and `Ще`. Each item SHALL have a recognizable icon, a visible
text label, and a tap target of at least 44 by 44 CSS pixels. Categories and Import / Export SHALL
NOT occupy additional persistent bottom-navigation slots. Desktop navigation SHALL continue to
show every screen directly, including History, Categories, and Import / Export.

#### Scenario: New history destination fits in the mobile bar

- **WHEN** the application is displayed at a mobile breakpoint
- **THEN** the bottom bar shows exactly `Місяць`, `Історія`, `Середні`, and `Ще` without horizontal
  scrolling, clipped labels, or a fifth navigation slot

#### Scenario: Desktop keeps direct destinations

- **WHEN** the application is displayed at a desktop breakpoint
- **THEN** Month, History, Averages, Categories, and Import / Export remain directly selectable and
  Sign out remains directly available

#### Scenario: Primary destination exposes its active state

- **WHEN** the user is viewing Month, History, or Averages on mobile
- **THEN** its corresponding bottom-navigation item is visually active and exposes
  `aria-current="page"`

### Requirement: Secondary mobile destinations are available through the More menu

Activating `Ще` in the mobile bottom navigation SHALL open an accessible bottom sheet or popover
containing `Категорії`, `Імпорт / експорт`, and `Вийти`. Selecting Categories or Import / Export
SHALL close the menu and open the corresponding screen. Selecting Sign out SHALL invoke the
existing sign-out behavior. While Categories or Import / Export is the current screen, the `Ще`
bottom-navigation item SHALL be visually active and expose `aria-current="page"`.

#### Scenario: User opens Categories through More

- **WHEN** the user opens `Ще` and selects `Категорії`
- **THEN** the menu closes, the Categories screen opens, and `Ще` is shown as the active
  bottom-navigation destination

#### Scenario: User opens Import / Export through More

- **WHEN** the user opens `Ще` and selects `Імпорт / експорт`
- **THEN** the menu closes, the Import / Export screen opens, and `Ще` is shown as active

#### Scenario: User signs out through More

- **WHEN** the user opens `Ще` and selects `Вийти`
- **THEN** the application invokes the same sign-out action currently available in the desktop
  header

#### Scenario: User dismisses More without navigating

- **WHEN** the `Ще` menu is open and the user taps its backdrop or presses Escape
- **THEN** the menu closes, focus returns to the `Ще` trigger, and the current screen does not
  change

#### Scenario: User chooses another primary destination while More is open

- **WHEN** the `Ще` menu is open and the user selects `Місяць`, `Історія`, or `Середні`
- **THEN** the menu closes and the selected primary screen opens

### Requirement: Mobile navigation respects device safe areas

The mobile bottom navigation and its `Ще` menu SHALL account for the device bottom safe-area inset.
The menu SHALL open above the persistent navigation rather than covering it, and page content SHALL
retain sufficient bottom padding so its final interactive content is not obscured by the bar.

#### Scenario: Navigation is used on a device with a bottom safe area

- **WHEN** the application runs on a mobile device with a non-zero bottom safe-area inset
- **THEN** all four bottom-navigation items remain fully tappable and the final page content and
  `Ще` menu actions are not hidden behind the device inset or navigation bar

### Requirement: Category history begins with category selection

The category-history screen SHALL initially prompt the user to select a category and SHALL NOT
silently preselect one. Its selector SHALL list active categories and archived categories that
have at least one transaction, sorted by localized category name. An archived category with no
transactions MAY be omitted.

#### Scenario: User selects trips before choosing months

- **WHEN** the user opens History and selects category `Поїздки`
- **THEN** the screen shows the full month history for `Поїздки` without requiring the user to
  inspect each Month view

#### Scenario: Archived category history remains discoverable

- **WHEN** archived category `Подорожі` has at least one historical transaction
- **THEN** `Подорожі` remains available in the category selector

#### Scenario: No category has been selected

- **WHEN** the History screen is opened and the user has not selected a category
- **THEN** the screen shows a clear category-selection prompt and no misleading monthly totals

### Requirement: Selected category is summarized across active calendar months

After category selection, the history screen SHALL display only calendar months containing at
least one matching transaction, across every year, newest first. Each row SHALL show the localized
month name, its year, and the signed sum of transactions matching that category and calendar month.

#### Scenario: Active months across years are visible together

- **WHEN** `Поїздки` has transactions totaling 3200 EUR in February 2025 and 850 EUR in April 2026
- **THEN** the overview shows April 2026 and February 2025, each with its respective signed total

#### Scenario: Refund reduces a monthly category total

- **WHEN** a selected category has a 500 EUR expense and a -100 EUR refund in May
- **THEN** May displays a signed total of 400 EUR, not 600 EUR

#### Scenario: Transactions can net to zero without erasing activity

- **WHEN** the selected category has a 100 EUR expense and a -100 EUR refund in June
- **THEN** June displays a zero net total but remains identifiable as a month with transactions and
  can still be expanded

### Requirement: Category history shows a full-history total

After category selection, the history screen SHALL show the signed sum of all transactions in the
selected category above the active-month list. This total SHALL update reactively after edits and
deletions.

#### Scenario: Total includes every year

- **WHEN** `Поїздки` has totals of 3200 EUR in 2025 and 850 EUR in 2026
- **THEN** the category total shows 4050 EUR

### Requirement: Monthly totals include a proportional visual indicator

Each month row SHALL include a horizontal indicator whose length represents the magnitude of that
month's signed total relative to the largest active monthly magnitude for the selected category.
The indicator SHALL use the selected category's existing deterministic color. The formatted signed
amount and month label SHALL remain present so the indicator is not the sole source of information.

#### Scenario: Largest month receives a full-length indicator

- **WHEN** the selected category's active monthly totals have magnitudes of 100, 250, and 500 EUR
- **THEN** the corresponding indicators use 20%, 50%, and 100% of the available track width

#### Scenario: Negative net month has a valid indicator

- **WHEN** a month's signed total is -200 EUR and the largest monthly magnitude is 400 EUR
- **THEN** its indicator occupies 50% of the available track and its text amount remains -200 EUR

#### Scenario: Every active monthly total is zero

- **WHEN** every active monthly total is zero
- **THEN** all indicators render with zero filled width and no division-by-zero, `NaN`, or
  `Infinity` output

### Requirement: Active months reveal matching transactions in place

A displayed month containing one or more transactions for the selected category SHALL be
expandable in place. Its expanded content SHALL list only transactions matching the selected
category and calendar month, ordered by date descending with a stable id tie-breaker. Only one
month SHALL be expanded at a time; activating it again SHALL collapse it.

#### Scenario: User inspects a month with trips

- **WHEN** the user expands April 2026 for category `Поїздки`
- **THEN** the screen lists only `Поїздки` transactions dated in April 2026, newest first

#### Scenario: User changes the expanded month

- **WHEN** February is expanded and the user expands April
- **THEN** February collapses and April expands


### Requirement: Category-history transaction rows use the existing editing flow

Selecting a transaction in expanded category history SHALL open the existing transaction edit
panel for that transaction. Saves and deletes SHALL update the full-history overview and expanded
list without a page reload. Changing the selected category SHALL clear expanded and editing state
that no longer belongs to the current result.

#### Scenario: Editing an amount updates the month total

- **WHEN** the user changes a displayed April transaction from 100 EUR to 150 EUR and saves
- **THEN** April's category total and proportional indicator update without a page reload

#### Scenario: Editing moves the transaction outside the current result

- **WHEN** the user changes an expanded transaction's category or date so it no longer matches the
  selected category and calendar month
- **THEN** the transaction disappears from the current history result and all affected totals
  recompute without a page reload

#### Scenario: Deleted last transaction collapses the month

- **WHEN** the user deletes the only transaction in an expanded month
- **THEN** the month disappears from the list and its now-empty expanded content closes

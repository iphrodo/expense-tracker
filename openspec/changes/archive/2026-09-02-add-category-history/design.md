## Context

`MonthView` already supports selecting a month and filtering its transaction list by category,
but its category choices are limited to categories active in that selected month. `AveragesView`
summarizes categories across complete months, but it does not show when the spending occurred or
the underlying transactions. The new flow needs to answer the inverse question: select one
category, then see its distribution across months.

The app currently uses local React screen state rather than a router. Transactions and categories
are already available through reactive repository hooks, and `EditTransactionPanel` is the
existing edit experience.

## Goals / Non-Goals

### Goals

- Make it possible to identify every month in which a selected category had spending without
  navigating through months individually.
- Keep the overview useful on a narrow mobile screen as well as desktop.
- Preserve access to historical data for archived categories.
- Reuse existing transaction editing and category color conventions.

### Non-Goals

- Comparing several categories with each other in the same chart.
- A desktop-style category-by-month matrix.
- Changing average/exclusion calculations or exposing exclusion controls in this screen.
- Adding user-configurable date ranges.
- Adding new database queries, tables, or persisted UI preferences.

## Decisions

### Decision: add a dedicated top-level `History` screen

The screen is directly discoverable and keeps category-first exploration separate from both the
month-first operational view and the averages report. It is a first-class destination in both
desktop and mobile navigation.

Alternatives considered:

- **Make rows in `AveragesView` clickable.** This is a useful future shortcut, but it does not
  provide an obvious destination before the user knows to open Averages and mixes actual history
  with average-specific semantics.
- **Add the view inside `MonthView`.** Rejected because the selected month would remain the primary
  context and recreate the navigation problem this feature is intended to solve.
- **Show a 12-column matrix for every category.** Rejected for the first version because it is
  difficult to scan and operate on mobile.

### Decision: keep four mobile bottom-nav items and move secondary actions under `Ще`

The current mobile bottom navigation has four text-only destinations. Adding History as a fifth
full-width item would reduce tap targets, force small or truncated labels, and leave little room
for future destinations. The mobile bar will instead contain four stable items:

1. `Місяць` — opens Month.
2. `Історія` — opens the new category-history screen.
3. `Середні` — opens Averages.
4. `Ще` — opens a bottom sheet or popover with `Категорії`, `Імпорт / експорт`, and `Вийти`.

Each bottom-nav item uses an icon plus a short Ukrainian label. The active primary destination is
visually indicated using the existing accent styling and `aria-current="page"`. If Categories or
Import / Export is currently open, `Ще` is treated as the active bottom-nav destination. Selecting
an item in `Ще` closes the menu and opens that screen. `Вийти` invokes the existing sign-out action.

The menu closes when the user selects an action, taps the backdrop, presses Escape, or changes to
another primary destination. It respects the bottom safe-area inset and does not cover the bottom
navigation itself.

Desktop navigation remains an inline list of all application screens, now including History;
Categories, Import / Export, and Sign out are not hidden behind `Ще` on desktop.

Alternatives considered:

- **Five equal-width text items.** Rejected because `Import / Export` and the new History label make
  the bar crowded on narrow devices and reduce scanability.
- **Horizontally scrollable navigation.** Rejected because destinations become hidden and the
  interaction is unusual for primary mobile navigation.
- **Hide labels and show five icons.** Rejected because several destinations do not have
  self-explanatory icons and icon-only navigation is less accessible.

### Decision: explicit category selection, then an all-time active-month overview

The initial state asks the user to select a category rather than silently choosing one. Once a
category is selected, the screen shows only the calendar months in which it has transactions,
across all years, newest first. Each row displays the localized month name and year so repeated
months from different years stay distinct. A total across every displayed month is shown above the
list.

Each row contains the localized month name, signed total, and a horizontal magnitude bar. The bar
is based on `abs(monthTotal) / max(abs(monthTotal))` across the selected category's full history. The amount
label always retains the signed value; using magnitude only for bar length prevents refunds from
producing invalid widths. A category whose active monthly net totals are all zero renders empty bars.

### Decision: expand monthly transactions in place

Selecting a month with transactions expands a list immediately below that month. The list contains
only transactions matching both the selected category and month, ordered by date descending with
a stable id tie-breaker. Selecting a transaction opens the existing `EditTransactionPanel`.

Only one month is expanded at a time. Selecting the open month again collapses it. Months without
matching transactions are non-expandable. Changing category clears the expanded month and
any currently selected transaction.

This avoids moving the user back into the month-first screen just to inspect details and avoids
adding cross-screen state plumbing to `MonthView`.

### Decision: derive everything from existing reactive data

The category total and transaction groups are derived from `useTransactions()` and
`useCategories()`. No aggregate values are persisted. Because these hooks already react to writes,
an edit or deletion made through the panel updates the history without a reload.

The category selector includes active categories and archived categories that have at least one
transaction. Archived categories with no history can be omitted. Categories are sorted
alphabetically and use the existing deterministic category color roles.

## Edge Cases

- Negative transactions reduce monthly totals and may make a month's net total negative.
- A month with transactions that net to zero still counts as an active, expandable month.
- If editing moves a transaction to another category or month, it disappears from the
  current result immediately; empty expanded content collapses.
- If the selected category is deleted or otherwise no longer available, selection returns to the
  empty state without crashing.

## Accessibility

- The category control has a visible label or accessible name.
- Month rows use buttons only when they can expand and expose `aria-expanded` state.
- Bars are supplementary; month name and formatted amount communicate the same information in
  text, including zero and negative values.
- Keyboard users can select a category, expand a month, and open a transaction.
- Mobile navigation icons have visible text labels; the active item exposes `aria-current="page"`.
- The `Ще` trigger exposes `aria-expanded`, the menu has an accessible name, focus moves into it
  when opened and returns to the trigger when closed, and Escape closes it.

## Why

The Month view's transaction list is grouped by day with every category mixed together. When a
user wants to check spending in just one category (e.g. "how much did I spend on coffee this
month, and which days"), they have to scan every day and every line manually. A compact, optional
category filter lets them narrow the list to only the days that had a purchase in that category,
without adding a persistent UI element that competes with the entry form for space.

## What Changes

- Add a compact category filter control (chip/dropdown style, collapsed footprint) near the day-
  grouped transaction list in the Month view.
- When a category is selected: only day groups that contain at least one transaction in that
  category are shown, and within each shown day group only that category's transactions are
  rendered (other categories' transactions on that day are hidden). Day totals reflect only the
  filtered category's transactions while filtered.
- When no category is selected (default/cleared state): the list behaves exactly as it does today
  — all days, all categories, unfiltered.
- The filter selection is scoped to the current month view session; switching months does not
  require re-selecting, but the filter still only affects the currently displayed month's list.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `expense-entry`: the Month view's transaction list (documented under "Entry screen is the app
  home") gains an optional category filter that changes which day groups and which transactions
  within them are rendered.

## Impact

- Affected code: `src/features/analytics/MonthView.tsx` (`dateGroups` computation and the day-list
  render block), likely a small new filter control component.
- No schema, storage, or API changes — filtering is a client-side view concern over already-loaded
  transactions.

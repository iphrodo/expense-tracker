## Why

The existing analytics flow is month-first: the user selects a month and only then finds a
category inside that month. Answering a category-first question such as "in which months did I
spend money on trips?" therefore requires opening and inspecting months one by one.

## What Changes

- Add a top-level `History` screen dedicated to category history.
- Rework mobile navigation into four compact destinations — `Місяць`, `Історія`, `Середні`, and
  `Ще` — so the new screen does not overcrowd the bottom bar. `Ще` exposes Categories,
  Import / Export, and Sign out.
- Let the user select a category first and inspect every month in which it has activity, across
  all years.
- Show each active month with its year, signed category total, and a compact visual bar, plus the
  category's total spending across the full history.
- Let the user open an active month in place to see that category's transactions for the month,
  newest first, and open the existing transaction edit panel from a transaction row.
- Include archived categories when they have transactions, so historical spending remains
  discoverable.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `expense-analytics`: adds a category-first full-history screen with monthly totals and
  drill-down to matching transactions.

## Impact

- `src/App.tsx`: add the `History` navigation destination, render the new screen, and split mobile
  navigation into three primary screens plus a `Ще` menu while retaining full desktop navigation.
- `src/features/analytics/`: add a category-history view and reuse the existing category colors,
  money formatting, repository hooks, and transaction edit panel.
- `src/lib/`: add a small pure aggregation helper if keeping the month grouping outside the
  component makes it easier to unit test.
- No database schema, migration, authentication, import/export, or transaction write-path changes.

## Context

The day-grouped list lives entirely inside `MonthView.tsx`: `dateGroups` (line ~178) is derived
from `sortedTransactions`, which comes from `monthTransactions` (transactions filtered to the
selected `month`). The render block (line ~388) maps `dateGroups` to day headers + transaction
rows. `rankedCategories` and `categoryById` are already computed in the same component and can
back a filter control without new data fetching — filtering is a pure derived-state addition.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Keep the filter control visually compact (one row, collapsed by default) so it doesn't compete
  with the entry form or push the list down.
- Reuse the existing category-color system (`getCategoryColorRoles`) so the filter reads
  consistently with the transaction rows and the existing `CategorySelector` chip styling.
- Keep filter state local to `MonthView` — no persistence, no URL param, no global store.

**Non-Goals:**
- No multi-category selection (single category or "all" only), matching the proposal's scope.
- No filtering by date range, amount, or note text — category-only, as requested.
- No changes to the sidebar stats/breakdown panels, which stay computed from the full
  `monthTransactions` regardless of the filter.

## Decisions

- **UI pattern: closed-by-default dropdown/select, not a chip row.** A horizontal chip row (like
  `CategoryChipsRow` in entry) shows every option at once and takes a full row of width even when
  unused. A single dropdown (native `<select>` or a small button that opens a popover list) shows
  as one compact control ("All categories ▾") and expands only on interaction. Given the
  "не повинен займати багато місця" constraint, the dropdown is the better default; chip-row
  reuse can be revisited later if the user wants faster single-tap switching.
- **Options list is scoped to the current month's transactions**, using the same
  `rankedCategories`/`monthTransactions` data already computed for the sidebar, filtered to
  categories with an entry in `dateGroups`. This avoids offering categories that would produce an
  empty list immediately, and keeps the dropdown short.
- **Filtering happens by adding a `selectedCategoryId: number | null` state and threading it
  through the existing `dateGroups` useMemo** (filter `sortedTransactions` to the selected
  category before grouping, when set), rather than filtering post-grouping. This keeps day totals
  automatically correct (computed from the already-filtered transactions) without a second
  totals calculation path.
- **No new component library or state management.** Local `useState` in `MonthView`, consistent
  with how `editingTx`, `statsOpen`, etc. are already managed there.

## Risks / Trade-offs

- [Filter state resets on remount/navigation away from Month view] → Acceptable per proposal
  ("scoped to the current month view session"); no persistence requirement was requested.
- [Dropdown discoverability may be lower than a chip row] → Mitigated by labeling the closed
  state clearly (e.g. "All categories ▾") so it reads as an active, changeable control rather than
  a static label.
- [Empty filtered state (selected category has zero transactions in a newly viewed month) could
  read as a bug rather than "no data"] → Reuse the existing "No transactions this month." empty
  state pattern, with copy indicating the filter is active (e.g. "No <Category> transactions this
  month.").

## 1. Filter state and derived data

- [x] 1.1 Add `selectedCategoryId: number | null` state to `MonthView`
- [x] 1.2 Compute `filterableCategories`: categories with at least one transaction in
      `monthTransactions`, ordered consistently with `rankedCategories`
- [x] 1.3 Update `sortedTransactions`/`dateGroups` derivation so that, when `selectedCategoryId`
      is set, only transactions in that category are included before grouping by day (day totals
      then naturally reflect only the filtered category)
- [x] 1.4 Reset or re-validate `selectedCategoryId` handling when `month` changes so the same
      category id stays applied to the newly selected month (no reset to `null` on month switch)

## 2. Filter control UI

- [x] 2.1 Build a compact closed-by-default control (e.g. "All categories ▾" button/select) placed
      near the day-grouped list header, using `filterableCategories` and existing category color
      roles for the selected state
- [x] 2.2 Wire control selection to `selectedCategoryId`, including a way to clear back to "All
      categories"
- [x] 2.3 Ensure the control's collapsed height doesn't add more than one row above the list

## 3. Empty and edge states

- [x] 3.1 Update the "No transactions this month." empty state to a filter-aware message when
      `selectedCategoryId` is set and the filtered `dateGroups` is empty
- [x] 3.2 Verify a category filtered out of `filterableCategories` (e.g. becomes archived or has
      no transactions after a switch) clears cleanly rather than leaving a stale selection

## 4. Verification

- [x] 4.1 Add/extend Vitest coverage for the `dateGroups` filtering logic (day grouping restricted
      to selected category, day totals reflect only filtered transactions, unfiltered case
      unchanged)
- [x] 4.2 Add/extend Vitest coverage for month-switch behavior while a filter is active (same
      category stays selected; empty filtered state when the new month has no matches)
- [x] 4.3 Run `tsc --noEmit` and the existing test suite to confirm no regressions

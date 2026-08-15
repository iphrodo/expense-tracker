## 1. ConfirmDialog component

- [x] 1.1 Create `ConfirmDialog` (e.g. `src/features/analytics/ConfirmDialog.tsx`): overlay +
      centered panel following the `EditTransactionPanel` overlay pattern, with a title, a reason
      `<textarea>` (initial value from a prop), Confirm/Cancel buttons, and an `onConfirm(reason)`
      / `onClose()` callback pair.
- [x] 1.2 Support dismiss via Cancel button and via backdrop click, making no state change on
      dismiss.

## 2. Flat, date-grouped transaction list

- [x] 2.1 In `MonthView.tsx`, replace the `grouped`-by-category `useMemo` (lines 67-79) with a
      derived date-descending sort of `monthTransactions` (secondary key: `id` descending).
- [x] 2.2 Derive date groups (`{ date, txs }[]`) from the sorted list for rendering date-header
      sections.
- [x] 2.3 Replace the category-card render block (lines 239-283) with the new flat list: date
      header per group, one row per transaction, row background/text classes taken from
      `categoryColors.get(tx.categoryId)`.
- [x] 2.4 Keep the existing month total display and the `grouped.length === 0` /
      "No transactions this month" empty state, adapted to the new list shape.
- [x] 2.5 Keep row click opening `EditTransactionPanel` via `setEditingTx(tx)`, unchanged.
- [x] 2.6 Remove the exclude/include text link and its `excluded` badge from the (now-removed)
      category card markup.

## 3. Exclusion control moves to the sidebar

- [x] 3.1 Add local state in `MonthView` for the dialog:
      `exclusionDialog: { categoryId: number; mode: 'exclude' | 'include' } | null`.
- [x] 3.2 Add an icon-button to each row in the "По категоріях" breakdown (lines 349-358) that
      opens the dialog with `mode: 'exclude'` (not yet excluded) or `mode: 'include'` (already
      excluded), based on `exclusionKeys.has(...)`.
- [x] 3.3 When opening in `mode: 'include'`, look up the existing `AverageExclusion.reason` for
      that `(categoryId, month)` from `exclusions` and pass it as the dialog's initial reason
      value.
- [x] 3.4 Wire the dialog's `onConfirm(reason)` to call `setExclusion(categoryId, month, reason)`
      (exclude) or `removeExclusion(categoryId, month)` (include), matching today's
      `toggleExclusion` behavior, with the same `try/catch` + `showErrorToast` error handling.
- [x] 3.5 Remove the old `window.prompt`-based `toggleExclusion` function and its direct call
      site.
- [x] 3.6 Move the "excluded from averages" badge to render next to the category name in the "По
      категоріях" row, driven by the same `exclusionKeys` check used today.

## 4. Manual verification

- [ ] 4.1 Run the app locally; confirm the main list shows transactions newest-date-first, grouped
      by date headers, each row colored to match its category's sidebar color.
- [ ] 4.2 Confirm exclude: click the sidebar icon on a non-excluded category, enter a reason,
      confirm, and verify an `AverageExclusion` is created (badge appears, averages update).
- [ ] 4.3 Confirm include: click the sidebar icon on an excluded category, verify the dialog
      pre-fills the existing reason, confirm, and verify the exclusion is removed.
- [ ] 4.4 Confirm dismiss (Cancel and backdrop click) makes no change in both directions.
- [ ] 4.5 Confirm clicking a transaction row still opens `EditTransactionPanel` and edits save
      correctly.
- [ ] 4.6 Confirm dark mode styling for the new dialog and colored rows.

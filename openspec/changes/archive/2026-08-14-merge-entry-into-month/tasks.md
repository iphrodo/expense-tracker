## 1. Extract the entry form

- [x] 1.1 Create `src/features/entry/ExpenseEntryForm.tsx` containing the state, handlers, and
      JSX currently in `EntryScreen.tsx` (amount input, `CategorySelector`, date controls, note
      toggle, save button, mount/post-save focus effect)
- [x] 1.2 Delete `src/features/entry/EntryScreen.tsx`

## 2. Embed the form in the Month view

- [x] 2.1 In `src/features/analytics/MonthView.tsx`, render `<ExpenseEntryForm />` as the first
      child of the main content column (`<div className="flex flex-1 flex-col gap-4">`), above the
      month/year pickers and transaction list
- [x] 2.2 Verify the sidebar column (`<div className="flex w-full shrink-0 flex-col gap-4
      lg:w-80">`) is untouched by the diff

## 3. Update navigation

- [x] 3.1 In `src/App.tsx`, remove `'entry'` from the `Screen` union and its `NAV_ITEMS` entry
- [x] 3.2 Change the initial `useState<Screen>` value from `'entry'` to `'month'`
- [x] 3.3 Remove the now-unused `EntryScreen` import and its conditional render branch

## 4. Verify behavior

- [x] 4.1 Run `npm run dev` and confirm cold launch lands on the Month view with the entry form
      focused and visible above the fold, no separate Entry tab in the bottom nav
- [x] 4.2 Save a transaction dated in the currently-viewed month and confirm it appears in the
      list below without a reload, sidebar totals update, and the amount field is refocused/empty
- [x] 4.3 Confirm keyboard-only batch entry (amount → Tab → category → Enter, repeated) still
      works with no mouse interaction
- [x] 4.4 Confirm the entry form's date stays independent of the month/year pickers: switch the
      sidebar's month picker to a past month, save without changing the entry form's date, and
      verify the transaction saves at the entry form's own date, not the viewed month
- [x] 4.5 Run `npm run lint` and `npm run test`

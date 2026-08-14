## 1. Project setup

- [x] 1.1 Scaffold Vite + React 19 + TypeScript project with strict TypeScript config (no `any`)
- [x] 1.2 Add and configure Tailwind
- [x] 1.3 Add Vitest and a basic test script
- [x] 1.4 Add `vite-plugin-pwa` (or equivalent), configure manifest and offline service worker for
      the app shell
- [x] 1.5 Add Dexie dependency and set up ESLint/TS strictness to reject `any`

## 2. Data model and repository

- [x] 2.1 Define Dexie schema: `Category`, `Transaction` (including `importRowIndex?: number`,
      indexed), `MonthFlag`, `AverageExclusion` per design.md's data model, with
      `AverageExclusion` unique on `(categoryId, month)`
- [x] 2.2 Implement repository module (`src/db/repository.ts`) wrapping all Dexie access behind
      plain-object functions (`create`, `update`, `delete`, live queries for reads); no Dexie
      types outside this module
- [x] 2.3 Implement integer-cents amount parsing/formatting helpers (decimal string ↔ integer
      cents), used everywhere amounts cross a boundary
- [x] 2.4 Wire analytics reads through Dexie live queries (or an equivalent reactive read) so
      month view, averages view, and daily run-rate update automatically on any write

## 3. Amount expression parser

- [x] 3.1 Implement a recursive-descent (or shunting-yard) parser for `+ - * / ( )` over decimal
      literals, producing one evaluated integer-cents result per top-level term
- [x] 3.2 Implement the splitting rule precisely: top-level `+`/`-` split into separate terms; a
      leading unary `-` on the first term negates it without splitting; `*`, `/`, and parenthesized
      sub-expressions evaluate within a single term
- [x] 3.3 Reject (inline, non-modal) any input containing a character outside `0-9 . + - * / ( )`
- [x] 3.4 Reject (inline, non-modal) an expression where the whole result, or any individual
      top-level term, evaluates to exactly 0
- [x] 3.5 Add an edit-mode variant/flag that additionally rejects any input producing more than
      one top-level term
- [x] 3.6 Unit test: top-level `+` splits addends into separate positive amounts (e.g.
      `5.96+4.22+4.96` → 3 amounts)
- [x] 3.7 Unit test: top-level `-` splits into separate transactions with correct signs (e.g.
      `17.03-10.50` → `+1703`, `-1050`)
- [x] 3.8 Unit test: leading unary `-` produces a single negative transaction (e.g. `-50.78` →
      one transaction of `-5078`)
- [x] 3.9 Unit test: `*` and `/` each produce a single transaction (e.g. `9.83*2` → `1966`;
      `500/50.85` → `983`, rounded to nearest cent)
- [x] 3.10 Unit test: parenthesized sub-expression combined with top-level `+` splits correctly
      (e.g. `9.99+62.3+(4.8+4.8+7.13)*0.9` → 3 transactions)
- [x] 3.11 Unit test: a zero-valued term or whole expression is rejected (e.g. `5+0+3` and `0`)
- [x] 3.12 Unit test: invalid input (e.g. stray characters) is rejected, not evaluated
- [x] 3.13 Unit test: edit-mode rejects a multi-term expression (e.g. `5.96+4.22`) while accepting
      a single-term one, including a single negative term

## 4. Averages and run-rate logic (pure functions, no Dexie)

- [x] 4.1 Implement `computeAverages(transactions, exclusions, monthFlags, now)` per design.md's
      algorithm: bidirectional complete-month determination from `MonthFlag`, group by
      `(categoryId, month)`, exclusion removal, per-category divisor from surviving months,
      amounts summed with their sign (no absolute-value conversion)
- [x] 4.2 Implement `computeDailyRunRate(transactions, categories, now)` for `isDaily` categories:
      current-month total (signed) ÷ days elapsed, plus full-month projection
- [x] 4.3 Unit test: per-category divisor differs correctly when categories have different counts
      of contributing months
- [x] 4.4 Unit test: an `AverageExclusion` removes its category-month from both numerator and
      divisor (not numerator only)
- [x] 4.5 Unit test: zero-divisor guard — all months of a category excluded yields a null/no
      average, not a crash or `NaN`/`Infinity`
- [x] 4.6 Unit test: current month is excluded from averages unless a `MonthFlag.isComplete: true`
      override exists
- [x] 4.7 Unit test: a past month is excluded from every category's average when a
      `MonthFlag.isComplete: false` exists for it, distinct from and in addition to any
      per-category `AverageExclusion`
- [x] 4.8 Unit test: an average computed over a month containing a refund (negative transaction)
      reflects the reduced total, not the refund filtered out or absoluted
- [x] 4.9 Unit test: daily run-rate divides by days elapsed (including today) and projects
      correctly to a full month, including when a refund reduces the current month's total

## 5. Expense entry screen

- [x] 5.1 Build entry screen as the app's root/home route; no other screen precedes it
- [x] 5.2 Amount input: autofocus on mount and after every save, wired to the expression
      parser/validator from section 3
- [x] 5.3 Category chips: recency-weighted frequency scoring computed from transaction history,
      rendered as always-visible chips (no dropdown), desktop viewport as the primary target
- [x] 5.4 "More" control revealing a category search field, hidden by default (mouse/chip path)
- [x] 5.5 Category type-ahead field: reached via `Tab` from the amount field, filters on typed
      prefix, arrow keys or continued typing to confirm a match, fully usable with no pointer
- [x] 5.6 `Enter` handler: saves the current transaction(s) and returns focus to an empty amount
      field within the same handler, with no intermediate unfocused render
- [x] 5.7 Date state: initialized to today on a fresh app load, persists across saves within the
      session (not reset per save), with a visible one-action "yesterday" step and a date picker
      for any other date
- [x] 5.8 Collapsed-by-default optional note field
- [x] 5.9 Save action: parses the amount expression into per-term transactions (signed amounts
      included), writes via the repository optimistically (UI clears before write resolves),
      shows Undo toast
- [x] 5.10 Undo action: deletes the transaction(s) from the most recent save while the toast is
      visible
- [x] 5.11 Keep the entry screen's component tree shallow; no UI library beyond Tailwind
- [x] 5.12 Integration test/manual script: log 3 transactions in sequence using only the keyboard
      (amount → Tab → category prefix → Enter, repeated), asserting no pointer event is required
      and focus lands back on the amount field after each save

## 6. Editing and deleting transactions

- [x] 6.1 Build an edit view/panel opened by selecting a transaction from the month view, with
      amount, category, date, and note pre-filled and editable
- [x] 6.2 Wire the edit view's amount field to the edit-mode parser variant from task 3.5,
      rejecting multi-term input inline
- [x] 6.3 Implement save-edit: updates the existing `Transaction` record in place (including a
      changed amount, category, date, or note), preserving `importRowIndex` unchanged, with no
      confirmation dialog
- [x] 6.4 Implement delete: removes the transaction, shows an Undo toast consistent with the entry
      screen's, and restores the transaction (including its original `importRowIndex`, if any) on
      Undo
- [x] 6.5 Unit test: editing amount/category/date/note updates the record without creating a new
      transaction
- [x] 6.6 Unit test: editing a transaction that carries an `importRowIndex` preserves that value
      after the edit is saved
- [x] 6.7 Unit test: deleting and then undoing restores the transaction with its original fields

## 7. Analytics: month view

- [x] 7.1 Build month view: transactions for the selected month grouped by category, with a
      category subtotal and a month total, amounts summed with their sign
- [x] 7.2 Mark categories with an active `AverageExclusion` for the viewed month visually, without
      hiding their transactions
- [x] 7.3 Add per-category exclusion toggle with optional reason, writing/removing an
      `AverageExclusion`
- [x] 7.4 Add a `MonthFlag` control for the viewed month (set complete or incomplete), distinct
      from the per-category exclusion toggle
- [x] 7.5 Make each transaction row selectable, opening it in the edit view from section 6
- [x] 7.6 Verify month view re-renders from the live query when a transaction is created, edited,
      deleted, or an Undo occurs, without a manual refresh

## 8. Analytics: averages view

- [x] 8.1 Build averages view rendering `computeAverages` output: average, `monthsCounted` per
      category row
- [x] 8.2 Render a null average (fully excluded category) as unavailable rather than blank/crash
- [x] 8.3 List active exclusions with the ability to remove one, recomputing averages after removal
- [x] 8.4 Verify averages view re-renders from the live query on any relevant write, without a
      manual refresh

## 9. Analytics: daily run-rate

- [x] 9.1 Build daily run-rate display: current-month `isDaily` total (signed) ÷ days elapsed,
      plus full-month projection

## 10. Data import

- [x] 10.1 Implement CSV parser for
      `row_index, date, category, amount_eur, note, is_daily, source_sheet`, accepting negative
      `amount_eur` as valid
- [x] 10.2 Add `importRowIndex?: number` to the `Transaction` schema (indexed in Dexie), set only
      on importer-created transactions
- [x] 10.3 Implement import: create categories from distinct `category` values with `isDaily` from
      the CSV, create one transaction per row (amount converted to integer cents, sign preserved),
      storing each row's `row_index` as `importRowIndex`
- [x] 10.4 Implement idempotency check keyed on `row_index` (indexed lookup against existing
      `importRowIndex` values) so re-running import does not duplicate rows — explicitly not a
      content-based key, since rows can legitimately share date/category/amount when a batched
      spreadsheet cell was expanded into multiple rows
- [x] 10.5 Reject a CSV containing a duplicate `row_index` as a malformed-file error
- [x] 10.6 Implement the count/sum assertion: accept `{ expectedRowCount, expectedAmountSum }`,
      parse the full file first, and abort with no writes if the parsed row count or amount_eur
      sum does not match, reporting expected vs. actual
- [x] 10.7 Fail loudly (abort with a row-identifying error) on a malformed row instead of skipping
      it; a negative `amount_eur` is not malformed
- [x] 10.8 Report created-category and imported-transaction counts on success
- [x] 10.9 Provide a way to trigger the one-time import from the app (e.g. a settings/import
      action) reading `/seed/transactions.csv`, calling it with the literal, currently-verified
      values `expectedRowCount: 1763` and `expectedAmountSum: 3644217` (36442.17 EUR in integer
      cents) — update both if `/seed/transactions.csv` is ever regenerated

## 11. Data export

- [x] 11.1 Implement CSV export of all transactions in the same column shape as import
      (`row_index, date, category, amount_eur, note, is_daily, source_sheet`), converting integer
      cents back to decimal EUR (sign preserved) and leaving `source_sheet` empty; re-emit
      `importRowIndex` as `row_index` where present, and mint a new unique index for transactions
      with none
- [x] 11.2 Wire export to a user-triggered download action

## 12. Verification

- [x] 12.1 Run the full Vitest suite and confirm all averages/parser/import unit tests pass
- [x] 12.2 Manually verify keyboard-only batch entry: log several transactions in a row using only
      the keyboard, on a desktop-sized viewport, confirming no pointer interaction is needed
- [x] 12.3 Manually verify edit and delete from the month view, including Undo on delete, and that
      analytics update without a reload
- [x] 12.4 Manually verify offline installability (service worker caches shell, app loads with
      network disabled)
- [x] 12.5 Manually verify the app remains usable (not necessarily optimized) on a phone-sized
      viewport, using the chip/mouse-equivalent touch path

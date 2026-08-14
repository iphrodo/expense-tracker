## Why

A nine-month-old Google Sheets workbook (1763 transactions, 29 categories, EUR) is the current
system of record for personal expenses, filled in on a desktop computer each evening while
reviewing the day's spending. It works, but has no fast keyboard-driven batch entry, no way to fix
a mistyped row without hunting through a spreadsheet, no per-category average with a correct
per-category divisor, and accumulates float rounding drift. This change replaces it with a
local-first PWA whose entire reason for existing is that logging (and correcting) an evening's
expenses must be faster than doing it in the sheet.

## What Changes

- Add a keyboard-driven expense entry screen that opens as the app's home screen: the amount
  field is focused on mount and after every save, `Tab` moves to a type-ahead category field,
  `Enter` saves and refocuses the amount field, and a batch of transactions can be logged with no
  mouse interaction at any point. Category chips remain as a mouse affordance. The date persists
  across saves within a session (resetting to today on a fresh load) since a batch is usually one
  date.
- Support arithmetic expressions in the amount field as a first-class feature (e.g.
  `9.99+62.3+(4.8+4.8+7.13)*0.9`), with an explicit splitting rule: top-level `+`/`-` split into
  separate transactions, `*`/`/`/parentheses stay within one term, and negative amounts (refunds)
  are valid — only a zero result is rejected.
- Add editing and deleting of any existing transaction from the month view — amount (via the same
  expression parser, restricted to a single resulting transaction), category, date, and note are
  all editable, deletes get an Undo affordance consistent with entry, and both are reflected in
  analytics without a reload.
- Add three read-only analytics views: month view (grouped transactions + total, exclusions marked
  not hidden), averages view (per-category average with a per-category divisor over
  months-that-actually-contributed, exclusions removed from both numerator and divisor,
  `monthsCounted` always shown, negative/refund amounts included arithmetically), and daily
  run-rate (isDaily categories, current month, projected).
- Add exclusion management: toggle a category-month out of averages from the month view, with an
  optional reason; averages view lists and can remove active exclusions. Add `MonthFlag` management
  from the month view, distinct from exclusions, that can mark a month complete or incomplete for
  every category at once — in either direction (e.g. forcing the current month in, or a partial
  first tracked month out).
- Add a one-time idempotent CSV import of `/seed/transactions.csv` (1763 rows, 29 categories,
  36442.17 EUR total, including 25 negative/refund rows) that creates categories and transactions,
  asserts the imported row count and amount sum against known-good values, reports counts, and
  fails loudly on malformed rows.
- Add CSV export of all transactions in the same shape as the import, for portability off the app's
  own storage.
- Introduce the Dexie/IndexedDB data model: `Category`, `Transaction` (amounts in integer cents),
  `MonthFlag`, `AverageExclusion`.

**Deferred / explicitly out of scope for this change** (may be proposed later): budgets or limits,
multi-currency, recurring transactions, charts, sync or multi-device accounts, receipt photos,
income tracking, tags or trip grouping, and any category management beyond rename and archive.

## Capabilities

### New Capabilities
- `expense-entry`: keyboard-driven batch transaction entry — amount expression parsing (including
  negative amounts), type-ahead category selection, session-persisting date, optimistic save with
  undo, and editing/deleting existing transactions.
- `expense-analytics`: read-only month view, per-category averages with correct divisor,
  bidirectional `MonthFlag` handling, exclusion handling, negative-amount arithmetic, and daily
  run-rate for `isDaily` categories — all reflecting writes without a reload.
- `data-import`: one-time idempotent CSV seed import (with row-count/amount-sum assertion) and CSV
  export of all transactions.

### Modified Capabilities
_None — this is a net-new application; there are no pre-existing specs._

## Impact

- New Vite + React 19 + TypeScript project, Tailwind for styling, Dexie for IndexedDB persistence,
  a service worker for offline/installable PWA behavior, Vitest for unit tests.
- New local database schema (`Category`, `Transaction`, `MonthFlag`, `AverageExclusion`) — no
  migration from an existing app database, since none exists yet.
- No server, no network calls, no third-party accounts. All persistence stays behind a repository
  module so a future sync backend can be added without touching UI or averages logic.
- Source data dependency: `/seed/transactions.csv` (exported from the existing Google Sheet) must
  exist at that path for the one-time import to run.

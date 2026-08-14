## Why

Logging a new expense and reviewing the current month currently live on two separate screens
reached via bottom navigation. The user has to leave the month they're looking at, enter a
transaction on the Entry screen, then switch back to Month to see it land. Merging entry into the
Month view's main content lets the user log an expense while looking directly at the month it will
land in, with no screen switch.

## What Changes

- The quick-entry form (amount, category selector, date, note, save) moves into the top of the
  Month view's main content column, above the category-grouped transaction list. It keeps its
  existing behavior: autofocus, expression parsing, keyboard-only batch entry, optimistic
  save with Undo toast, session-persisted date.
- The Month view's right sidebar (summary, "Детально", "По категоріях") is unchanged.
- The standalone Entry screen and its "Entry" bottom-nav tab are removed. **BREAKING**: any
  deep-link or stored state referring to the `entry` screen no longer resolves to a distinct
  screen.
- The app's home/launch screen becomes Month (with the entry form at the top), replacing the
  former Entry screen as the first thing rendered on launch.
- A newly-saved transaction, if dated within the currently-viewed month, appears in the
  transaction list below without a reload (existing month-view live-update behavior already
  covers this).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `expense-entry`: "Entry screen is the app home" requirement no longer describes a standalone
  screen — the entry form is now embedded at the top of the Month view's main content, and the
  Month view (not a separate Entry screen) is what the app opens on. Focus-on-mount /
  focus-after-save behavior is retained but now scoped to the embedded form.
- `expense-analytics`: Month view's main content requirement gains the entry form as its first
  element, above the category-grouped transaction list, while the right sidebar is explicitly
  unchanged.

## Impact

- `src/App.tsx`: remove the `entry` screen and its nav item; default screen becomes `month`.
- `src/features/entry/EntryScreen.tsx`: form logic is embedded into `MonthView.tsx` (or extracted
  into a shared component both can render) rather than mounted as its own routed screen.
- `src/features/analytics/MonthView.tsx`: main content column renders the entry form above the
  transaction list; sidebar JSX untouched.
- No database/schema changes.

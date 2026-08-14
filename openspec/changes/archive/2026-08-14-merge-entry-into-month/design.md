## Context

`src/features/entry/EntryScreen.tsx` and `src/features/analytics/MonthView.tsx` are currently two
independently-mounted screens switched by `src/App.tsx`'s `screen` state and bottom nav. See
proposal.md for motivation. `MonthView` already has a two-column layout (`flex-1` main content +
`w-80` sidebar) and already re-renders live off `useTransactions()`/`useCategories()` (Dexie live
queries), so a newly-saved transaction dated in the viewed month will show up without extra
plumbing once the form is mounted inside `MonthView`.

## Goals / Non-Goals

**Goals:**
- Entry form's existing behavior (focus management, expression parsing, keyboard batch entry,
  optimistic save + Undo, session-persisted date) is preserved unchanged.
- Sidebar content/behavior in `MonthView` is untouched.
- Reduce the bottom nav to `Month | Averages | Import / Export`.

**Non-Goals:**
- No change to the entry form's own UI/fields, the expression parser, or category ranking logic.
- No change to how averages/exclusions/month flags work.
- Not changing the sidebar layout or content in any way.

## Decisions

- **Extract, don't duplicate**: pull the JSX + state/handlers currently in `EntryScreen.tsx` into
  a component (e.g. `ExpenseEntryForm`) that `MonthView.tsx` renders at the top of its main
  content `<div className="flex flex-1 flex-col gap-4">`. `EntryScreen.tsx` is deleted rather than
  kept as a thin wrapper, since there is no longer a route that mounts it standalone.
  - Alternative considered: keep `EntryScreen` mounted but visually nested inside `MonthView`.
    Rejected — it would mean two live-query subscriptions to the same data for no benefit, and
    keeps a dead "screen" concept alive that nothing routes to anymore.
- **Month/App changes**: `src/App.tsx` drops the `'entry'` member from the `Screen` union and its
  `NAV_ITEMS` entry; `screen` state's initial value becomes `'month'`.
- **No shared date coupling**: the entry form keeps its own independent date field (defaulting to
  today, persisted per session) rather than syncing to whatever month is selected in the sidebar
  month/year pickers. Saving while viewing a past month still saves at the form's own date. This
  matches current EntryScreen behavior and avoids surprising backdating.
- **Focus behavior stays scoped to the form**: the existing `useEffect(() => amountRef.current
  ?.focus(), [])`-on-mount behavior moves as-is into the extracted component; since `MonthView`
  now mounts once at app start (it's the new home screen) this still fires once on load, matching
  today's "focus on mount" behavior for the Entry screen.

## Risks / Trade-offs

- [Two-column layout may push the entry form far down on narrow viewports if it stacks above the
  sidebar in DOM order] → Verify in a mobile-width browser that the entry form is still the first
  thing shown above the fold in the main column, consistent with the existing entry form's
  UX goal; no structural CSS change is expected since flex-col already stacks main-content
  children in DOM order above the transaction list.
- [Removing `EntryScreen.tsx` entirely is a bigger diff than adding a wrapper] → Accepted: keeping
  a dead standalone screen around would be confusing given `expense-entry`'s own spec now says
  there's no separate Entry screen.

## Why

The main transaction list groups by category, so the newest transaction anyone actually cares
about can be buried inside a category card while stale categories with old totals sit at the top
(name-sorted). Exclude/include also lives inline on every category card as a bare text link that
calls `window.prompt()` — a native browser prompt with no styling, no way to see or edit an
existing reason, and no confirmation step before an include silently deletes the exclusion. Both
problems compound: the "По категоріях" sidebar already shows the same categories with color
coding, so exclude belongs there instead of duplicated on the main list, and the main list should
instead show recent activity so the user can see what they just entered.

## What Changes

- **BREAKING**: Remove the category-grouped card list from the Month view's main content and
  replace it with a flat, reverse-chronological transaction list (newest date first; ties broken by
  a stable secondary key such as id), grouped visually only by date headers, not by category.
- Each transaction row in the new flat list SHALL be tinted with its category's color, using the
  same deterministic `assignCategoryColors` mapping already used by the sidebar breakdown, so a
  category reads as the same color everywhere.
- Remove the inline "exclude"/"include" text link from the (now-removed) category cards.
- Add an exclude/include icon-button to each row of the "По категоріях" sidebar breakdown.
  Clicking it opens a confirmation dialog (new `Dialog`/`Modal` component — none exists in the
  codebase today) with a free-text reason field, replacing the current `window.prompt()` call for
  the exclude direction and adding a confirmation step (currently absent) for the include
  direction.
- The dialog SHALL pre-fill the existing reason when toggling an already-excluded category-month
  back to included, so the user can see why it was excluded before confirming removal.
- The "excluded from averages" indicator SHALL remain visible after the card list is removed; it
  moves to the sidebar breakdown row (and/or appears as a per-row tag in the flat transaction list)
  so exclusion state stays legible without the old cards.
- Clicking a transaction row in the new flat list SHALL still open `EditTransactionPanel`, same as
  today.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `expense-analytics`: main content transaction list changes from category-grouped cards to a
  flat, color-coded, date-grouped list; the per-category exclusion toggle moves from the main list
  to the sidebar breakdown and gains a confirmation dialog with a reason field, replacing the
  current bare `window.prompt()` flow.

## Impact

- `src/features/analytics/MonthView.tsx`: removes the `grouped`-cards render block, adds a flat
  sorted transaction list render, moves the exclude control and its handler into the sidebar
  breakdown section, wires a new dialog component instead of `toggleExclusion`'s `window.prompt`.
- New component (e.g. `src/components/Dialog.tsx` or `src/features/analytics/ExclusionDialog.tsx`):
  a reusable confirmation dialog with a reason textarea, used for both exclude and include
  confirmation.
- `src/lib/categoryColor.ts`: no behavior change, but its `assignCategoryColors` output is now
  consumed in a second place (the flat transaction row) in addition to the sidebar.
- `src/db/repository.ts`: `setExclusion`/`removeExclusion` calls move call sites but keep their
  existing signatures; no schema or API change.
- No changes to `src/db/schema.ts` — `AverageExclusion` stays keyed on `(categoryId, month)` with
  an optional `reason`.

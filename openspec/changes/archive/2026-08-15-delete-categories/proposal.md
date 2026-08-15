## Why

Categories can currently be created but never removed or hidden — a mistyped or one-off category
stays in the picker forever with no way to clean it up. There is also no screen for managing
categories at all today; the only category UI is the inline "Create…" option inside the expense
entry chip/search panel. Separately, category display colors are derived from each category's
position in the id-sorted list (`index % 17` into a fixed palette), so removing one category can
silently reassign the colors of unrelated, unchanged categories — an especially sharp problem once
deletion becomes possible. Storing the color once, at creation time, removes this class of bug
entirely rather than just making the recomputation stable.

## What Changes

- Add a categories management view where a user can see all categories and delete one.
- Deleting a category SHALL be a soft delete: it sets the existing (currently unused) `is_archived`
  flag rather than removing the row, since `transactions.category_id` and
  `average_exclusions.category_id` are `ON DELETE RESTRICT` and a hard delete would fail outright
  for any category with history, or silently orphan data if the constraint were loosened.
- Archived categories SHALL disappear from category selection/creation surfaces (entry chips,
  type-ahead, "more" search, create-new lookup) but SHALL remain attached to their existing
  transactions and exclusions, which keep displaying the category's name and color unchanged.
- Deleting a category with zero existing transactions or exclusions SHALL still archive it (not
  hard-delete) rather than exposing two different delete behaviors to the user.
- **BREAKING**: category display color moves from a value computed on every render
  (position-in-sorted-id-list, `sortedIndex % 17`) to a `color` column stored on the `categories`
  row, assigned once when the category is created and never recalculated afterward. This requires
  a DB migration (new `color` column, backfilled for existing categories) and is required so
  archiving/deleting a category can never change the color of any other, unaffected category.
- New categories continue to receive a color automatically (no manual picker is introduced) — this
  proposal changes *when and how* that color is assigned (once, at creation, stored) rather than
  whether one is assigned.

## Capabilities

### New Capabilities
- `category-management`: viewing the list of categories and deleting (archiving) a category,
  including how archived categories are excluded from selection while preserving historical
  transaction data.

### Modified Capabilities
- `expense-entry`: the "Category chips and search results are rendered with the category's display
  color" requirement is updated so the color mapping is guaranteed stable per category id
  regardless of other categories being archived/deleted, and quick-access/type-ahead/"more" surfaces
  must exclude archived categories.

## Impact

- `src/db/schema.ts`, `supabase/migrations/`: `is_archived` already exists and needs no change; a
  **new migration** adds a `color` column to `categories` and backfills it for existing rows. The
  `Category` TS type gains a `color` field.
- `src/db/repository.ts`: `getOrCreateCategory` assigns and persists a `color` at insert time; add
  an `archiveCategory(id)` (or equivalent) write path; category read paths used for selection must
  filter out archived rows.
- `src/lib/categoryColor.ts`: no longer computes a color per id at render time; keeps/exports the
  palette and the assignment logic used at creation/backfill time only.
- `src/features/entry/CategorySelector.tsx`: exclude archived categories from chips, type-ahead, and
  "more" search/create; read `category.color` directly instead of calling a color-computation
  function.
- New UI surface for the categories management view (exact placement — new screen vs. extending
  `ImportExportScreen.tsx` — decided in design.md); no existing management screen exists to extend
  cleanly today.

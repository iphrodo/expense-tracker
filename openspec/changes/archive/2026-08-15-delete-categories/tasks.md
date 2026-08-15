## 1. Stored per-category color

- [x] 1.1 Add a new migration (`supabase/migrations/`) that adds a `color` column to `categories`
- [x] 1.2 In the same migration, backfill `color` for every existing row using round-robin
      assignment through the existing palette, in `id` ascending order
- [x] 1.3 Add `color` to the `Category` type in `src/db/schema.ts`
- [x] 1.4 Update `getOrCreateCategory` in `src/db/repository.ts` to assign and persist a `color`
      (round-robin by current category count, including archived) when inserting a new category
- [x] 1.5 Update `src/lib/categoryColor.ts` and its call sites so rendering reads `category.color`
      directly instead of computing a color from the id set; keep only the palette/assignment logic
      still needed by 1.2/1.4
- [x] 1.6 Update/add tests asserting a category's stored color is unchanged when other categories
      are archived, deleted, or created

## 2. Archive write path

- [x] 2.1 Add a repository function (e.g. `archiveCategory(id)`) in `src/db/repository.ts` that
      sets `is_archived = true` for a category and refreshes `categoriesStore`
- [x] 2.2 Ensure `getOrCreateCategory` and other category read paths (`src/db/repository.ts:260,
      270, 447`) filter to `is_archived = false` (or equivalent) where the result feeds selection
      UI, so archived categories aren't offered and re-typing an archived name creates a new row

## 3. Categories management view

- [x] 3.1 Add a new "Categories" view listing all non-archived categories with name and display
      color
- [x] 3.2 Add a delete action per row that calls the archive write path immediately (no
      confirmation dialog), removing the row from the list on success
- [x] 3.3 Wire a navigation entry point to the new view (e.g. settings/menu item)
- [x] 3.4 Ensure the delete action and list are operable via keyboard, not just pointer

## 4. Selection surfaces exclude archived categories

- [x] 4.1 Verify/update `src/features/entry/CategorySelector.tsx` (chips, type-ahead, "more"
      search) so archived categories never appear, using the filtered read path from 2.2
- [x] 4.2 Verify historical views (month view, analytics) still render archived categories'
      existing transactions with correct name/color, unaffected by the archive filter

## 5. Verification

- [x] 5.1 Manual/UI test: delete a category with no transactions — disappears from management view
      and all entry surfaces
- [x] 5.2 Manual/UI test: delete a category with existing transactions — succeeds, transactions
      keep their name/color and remain visible in month view and analytics
- [x] 5.3 Manual/UI test: after deleting category A, confirm an unrelated category B's chip color
      is unchanged

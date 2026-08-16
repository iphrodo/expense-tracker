## 1. Color assignment

- [x] 1.1 In `src/lib/categoryColor.ts`, add a function that picks the first `PALETTE` index not
      currently used by any category in a given active-categories list, falling back to
      `colorForIndex(count)` round-robin once every palette entry is in use.
- [x] 1.2 Add/extend unit tests in `src/lib/categoryColor.test.ts` covering: unused color picked
      first, fallback to round-robin once palette is exhausted, empty active-category list.

## 2. Repository functions

- [x] 2.1 Add `createCategory(name: string, isDaily: boolean): Promise<number>` to
      `src/db/repository.ts`, reusing the case-insensitive active-name duplicate check from
      `getOrCreateCategory` (reject on duplicate) and the new "first unused color" helper from
      task 1.1.
- [x] 2.2 Add `updateCategory(id: number, patch: { name?: string; isDaily?: boolean }):
      Promise<void>` to `src/db/repository.ts`, applying the same duplicate-name check (excluding
      the row being updated) when `name` changes, and refreshing `categoriesStore` on success.
- [x] 2.3 Add/extend tests in `src/db/repository.test.ts` for `createCategory` (assigns distinct
      color, rejects duplicate name) and `updateCategory` (renames, retypes, rejects duplicate
      name, leaves color unchanged).

## 3. Shared category form UI

- [x] 3.1 Add a `CategoryForm` component (in `src/features/categories/`) with name input and
      DAILY/NON-DAILY choice, accepting optional initial values and a submit handler; show a
      validation message on duplicate-name rejection from the repository call.

## 4. Categories management view

- [x] 4.1 Add an "Add category" entry point to `CategoriesScreen.tsx` that opens `CategoryForm` in
      create mode and calls `createCategory` on submit.
- [x] 4.2 Add an "Edit" action to each `CategoryRow` that opens `CategoryForm` pre-filled with the
      category's current name/type and calls `updateCategory` on submit.
- [x] 4.3 Verify a newly created or retyped category appears in the correct Daily/Non-daily group
      immediately (relies on existing `useCategories()` live query).

## 5. Verification

- [x] 5.1 Run the full test suite and typecheck.
- [x] 5.2 Manually exercise: create a DAILY category, create a NON-DAILY category, edit a
      category's name, edit a category's type, attempt a duplicate name on both create and edit.

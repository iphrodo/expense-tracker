## Why

Categories can currently only be created implicitly, by typing a new name while entering an
expense, and the categories management view only supports viewing and deleting. Users have no way
to create a category ahead of time or fix a category's name/type after the fact without deleting
it and starting over (which would orphan its history under a new id). The categories management
view needs its own explicit "add" and "edit" affordances.

## What Changes

- Add an "Add category" action on the categories management view that opens a form to enter a
  name and choose DAILY or NON-DAILY. On save, a color is assigned automatically from the existing
  palette, chosen to be distinct from every other active category's color (not just the next
  round-robin slot, which can repeat once more categories exist than palette entries).
- Add an "Edit" action on each category row in the management view that opens a form pre-filled
  with the category's current name and DAILY/NON-DAILY type, letting the user change either and
  save. Renaming/retyping updates the category in place; past transactions keep referencing the
  same category id, so they immediately reflect the new name/type/color everywhere.
- Enforce the same uniqueness rule already used for implicit category creation: a new or renamed
  category's name may not collide (case-insensitively) with another active category's name.

## Capabilities

### Modified Capabilities
- `category-management`: adds requirements for explicitly creating a category (with type
  selection and automatic unique color assignment) and editing an existing category's name/type
  from the management view.

## Impact

- `src/features/categories/CategoriesScreen.tsx`: add "Add category" entry point and per-row
  "Edit" action, plus a shared create/edit form.
- `src/db/repository.ts`: add a `createCategory` function (explicit creation, distinct from
  `getOrCreateCategory`'s implicit lookup-or-create) and an `updateCategory` function (name/type);
  extend color assignment to pick a color unused among active categories rather than pure
  round-robin.
- `src/lib/categoryColor.ts`: extend/adjust color assignment logic to consider active categories'
  existing colors.

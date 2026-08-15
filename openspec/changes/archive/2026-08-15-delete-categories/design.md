## Context

`categories` already has an `is_archived` boolean (`0001_init.sql`, `src/db/schema.ts`) that is
persisted and round-tripped through backup/restore (`src/lib/backup.ts`,
`src/db/repository.ts::restoreFromBackup`-adjacent code) but nothing ever sets it `true`. Category
creation is `getOrCreateCategory(name, isDaily)` in `src/db/repository.ts:258-277`. Category reads
live at `src/db/repository.ts:260,270,447` via `supabase.from('categories')`, feeding a
`categoriesStore`. `transactions.category_id` and `average_exclusions.category_id` are
`ON DELETE RESTRICT` (`0001_init.sql:15,27`), so a real `DELETE` on a referenced category fails at
the DB layer. Display color comes from `assignCategoryColors` in `src/lib/categoryColor.ts`, which
takes whatever set of category ids is passed in, sorts it ascending, and maps
`index % PALETTE.length` — so the color of every category downstream of a removed one shifts
whenever the input set shrinks, even though today the input set only shrinks by nothing (no delete
exists yet). This design stores color instead of recomputing it, so this recompute-on-shrink
behavior is retired rather than patched. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Let a user remove a category from every selection surface without breaking existing transactions
  or exclusions that reference it.
- Guarantee a category's display color never changes because of an unrelated category being
  archived, deleted, or created.
- Reuse the existing `is_archived` field for delete; add the minimum new schema needed (a `color`
  column) to make color a stored, fixed fact rather than a derived one.

**Non-Goals:**
- Hard/permanent deletion of a category row. Not offered in this change, even for categories with
  zero transactions — one delete behavior, no branching UI.
- Un-archiving (restore) UI. Out of scope; can be added later as a separate change if needed. (If
  the user needs the category back, they can create a new one with the same name — see Open
  Questions.)
- Manual color picking. Colors remain fully automatic.
- Bulk delete / multi-select in the management view.

## Decisions

**Soft delete via `is_archived`, not hard delete.**
The FK is `ON DELETE RESTRICT`, so hard-deleting a category with any history fails today. Loosening
it to `CASCADE` would silently destroy transactions; `SET NULL` would leave transactions with no
category, which the rest of the app doesn't model (category is non-nullable everywhere it's read).
Soft delete via the already-existing, already-persisted `is_archived` flag needs no migration and
keeps history intact. Alternative considered: add a new `deleted_at` timestamp — rejected as
redundant with the unused `is_archived` boolean already in the schema and in backup/restore.

**One delete behavior regardless of usage.**
Considered offering hard-delete only for categories with zero transactions/exclusions. Rejected:
two different actions behind one "delete" button is a confusing surface for a small, low-frequency
feature, and it adds no real benefit today (categories store nothing else worth reclaiming).

**Color stored on the category row, assigned once at creation, not recomputed.**
Add a `color` column to `categories` and set it in `getOrCreateCategory` at insert time, picking
the next palette entry round-robin based on the count of existing categories (including archived
ones, so the counter is monotonic and never reuses a slot out of sequence within a session). Once
written, `color` is never recalculated — rendering reads it directly off the row. This guarantees
archiving/deleting one category cannot affect another's color, since each row's color is
independent, without needing any hash function or relying on `id` distribution. Alternative
considered: keep computing color at render time from a hash of `id` (no schema change needed) —
rejected in favor of storage because a stored value is a stronger, simpler guarantee (no reliance
on hash-quality/collision behavior) and because it opens the door to a future manual color
override without further schema change. Existing categories are backfilled with a color in the
same migration that adds the column (round-robin in `id` ascending order, so pre-migration
categories get an assignment consistent with how new ones will be assigned going forward).
Collisions (two categories sharing a palette slot) remain possible once category count exceeds 17,
same as today.

**Archived categories are filtered at the read layer used for selection, not deleted from the
store.**
`categoriesStore`/read queries used by `CategorySelector.tsx` add a `.eq('is_archived', false)`
(or equivalent client-side filter) so archived categories vanish from chips/type-ahead/"more"
search and from `getOrCreateCategory`'s name-lookup (a re-typed name for an archived category
creates a fresh row rather than resurrecting the archived one — simplest behavior, avoids needing
unarchive logic). Views that render historical transactions (month view, analytics) continue to
read category name/color directly off the transaction's joined category record, unfiltered by
`is_archived`, so old data keeps displaying correctly.

**Management view placement.**
Add a new, small "Categories" view rather than extending `ImportExportScreen.tsx` — import/export
is a distinct concern (data transfer) and mixing category CRUD into it would overload that screen.
Exact navigation entry point (settings menu item, icon in month view sidebar, etc.) is a UI-layer
detail left to implementation; not spec-relevant since no requirement pins the exact entry point.

## Risks / Trade-offs

- [Re-creating a category with the same name after archiving produces a second, unrelated row with
  a new id and thus a new computed color] → Acceptable: this mirrors how the app already treats
  distinct rows, and is called out so it isn't mistaken for a bug during implementation/testing.
- [No undo for delete] → Mitigation: action is a soft delete (archive), so data is never destroyed;
  a future change can add a restore/unarchive affordance without a migration if this turns out to
  matter in practice.
- [Backfilling `color` for existing categories on first deploy reassigns colors that differ from
  today's position-based ones] → Acceptable one-time visual shift; no functional impact, and it
  only happens once at rollout, not on every future delete (which is the problem being fixed).
- [Round-robin-by-count at creation time is not perfectly collision-free if categories are created
  concurrently by the same account from two clients] → Acceptable: worst case is two categories
  sharing a palette slot, which is already a possible outcome today once category count exceeds 17,
  and single-user usage makes true concurrent creation unlikely.

## Migration Plan

One new DB migration: add `categories.color` (nullable-then-backfilled, or backfilled in the same
migration transaction) and set it for every existing row via the round-robin-by-id-order logic
described above; `is_archived` and its default already exist and need no migration. Deploy is a
single release: ship the migration, the creation-time color assignment, the archive write path,
the read-path filtering, and the new management view together, since the delta spec ties the
color-stability guarantee to the same release that introduces deletion. No feature flag — rollback
is a normal revert (the `color` column can be left in place even if the rest of the release rolls
back, since it's additive).

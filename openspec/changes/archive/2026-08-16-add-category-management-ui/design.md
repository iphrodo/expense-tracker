## Context

Categories today are created only implicitly, via `getOrCreateCategory(name, isDaily)`
(`src/db/repository.ts:261`), which assigns a color with `colorForIndex(count)` — a round-robin
index over the total row count (including archived rows). `CategoriesScreen.tsx` currently only
lists active categories (grouped Daily/Non-daily) and offers delete (archive). There is no update
path for an existing row's `name`/`is_daily`, and no explicit "create" entry point outside typing
a new name in the expense entry form. See proposal.md for why this is being added.

`PALETTE` in `src/lib/categoryColor.ts` has 17 entries. Round-robin-by-count means once more than
17 categories have ever been created (active + archived), new categories start repeating a hue
already in use by an active category — the "distinct from other active categories" requirement in
the proposal can't be satisfied by the existing round-robin scheme alone.

## Goals / Non-Goals

**Goals:**
- Add `createCategory(name, isDaily)` and `updateCategory(id, patch)` to the repository, following
  the existing patterns (`getOrCreateCategory`, `archiveCategory`).
- Change color assignment so a newly created category gets a color unused among currently active
  categories, when one is available.
- Add create/edit UI to `CategoriesScreen.tsx` reusing one form component for both flows.

**Non-Goals:**
- Letting the user pick or edit a color manually — colors stay system-assigned, matching the
  existing behavior for implicit creation.
- Changing how `getOrCreateCategory` (implicit creation from the expense entry form) picks colors
  beyond sharing the same underlying "first unused among active" helper, so behavior stays
  consistent between the two creation paths.
- Reworking the palette itself (size, hues) — out of scope here.

## Decisions

**Color selection: "first palette color unused among active categories," not a new random/hash
scheme.**
Query active categories' `color` values, compute the palette indices in use, and pick the first
`PALETTE` index not in that set (wrapping to round-robin-by-count as a fallback once all 17 are
in use). This is a small change to the existing `colorForIndex`-based flow rather than a new
algorithm, keeps the palette's hand-tuned max-distinctness ordering, and only changes behavior
once a user has enough active categories for collisions to matter. Alternative considered:
generate/hash a new color per category — rejected, since it would abandon the curated
palette/role-mapping (`ROLE_BY_FAMILY`) that the rest of the UI (dot/tint/text) depends on.

**Reuse `getOrCreateCategory`'s name-uniqueness check for both create and edit.**
`getOrCreateCategory` already does a case-insensitive-by-equality lookup against active category
names before inserting. `createCategory` and `updateCategory` should run the same check (excluding
the row being edited, for `updateCategory`) so duplicate-name rejection behaves identically across
all three entry points.

**One shared form component for add and edit.**
Both flows collect the same two fields (name, DAILY/NON-DAILY). A single `CategoryForm` component
takes optional initial values and a submit handler, used in "create" mode (empty) and "edit" mode
(pre-filled), avoiding duplicated form/validation code in `CategoriesScreen.tsx`.

## Risks / Trade-offs

- [Computing "colors in use" requires reading all active categories' colors before insert, adding
  a query to the create path] → Already fetching categories client-side via `useCategories()`
  hook for the management view; the create/edit form can reuse that same in-memory list instead of
  an extra network round-trip.
- [Once active categories exceed the 17-color palette, "distinct from every other active category"
  can no longer hold] → Explicitly allowed by the spec's fallback clause; no error surfaced to the
  user, matching current graceful round-robin behavior.

## Context

`MonthView.tsx` currently renders one block per category (`grouped`, computed at
`MonthView.tsx:67-79`) as a self-contained card with a name, subtotal, exclude/include text link,
and its own `<ul>` of transactions (`MonthView.tsx:239-283`). Exclude/include calls
`toggleExclusion` (`MonthView.tsx:165-177`), which uses `window.prompt()` for the reason and
applies `removeExclusion`/`setExclusion` (`src/db/repository.ts:309-345`) with no confirmation
step. The sidebar's "По категоріях" block (`MonthView.tsx:331-362`) already computes the same
per-category subtotals (`categoryBreakdown`, lines 83-101) and colors them via
`assignCategoryColors()` (`src/lib/categoryColor.ts`). There is no `Dialog`/`Modal` component
anywhere in `src` today — confirmations are native `window.prompt`/`window.confirm`, and the only
existing overlay-style UI is `EditTransactionPanel`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Replace the category-grouped card list with a flat, date-descending transaction list, colored
  per row by category, grouped visually by date headers.
- Move exclude/include entirely into the "По категоріях" sidebar rows, behind a confirmation
  dialog with a reason field that also works for include (currently un-confirmed) and pre-fills
  the existing reason.
- Introduce one small reusable dialog primitive, sized for this use case — not a general-purpose
  modal framework.

**Non-Goals:**
- No change to how `AverageExclusion` is stored, computed, or affects averages — only where the
  control lives and how it's confirmed.
- No pagination/virtualization of the transaction list; month-scoped transaction counts are small
  enough (per existing data, low hundreds at most) that a plain sorted array render is sufficient.
- No change to `EditTransactionPanel` itself, beyond it being opened from a differently-shaped
  parent list.
- No redesign of the summary/"Детально" sidebar blocks.

## Decisions

**Flat list grouping: compute date groups client-side from the existing `monthTransactions`
array, not a new query.** `monthTransactions` (`MonthView.tsx:62-65`) already holds every
transaction for the selected month. Replace the `grouped`-by-category `useMemo` with a sort by
`date` descending (secondary key: `id` descending, since higher ids are more recently created —
`Transaction` has no separate `createdAt`) and a derived list of `{ date, txs }` groups for
rendering date headers. Alternative considered: add a `createdAt` column for a true
"most-recently-added" ordering — rejected as unnecessary scope; `date` descending with `id` as a
tiebreaker already satisfies "most recently added within a date shows first" for the normal entry
flow (new entries get increasing ids), without a schema/migration change.

**Row color: reuse `assignCategoryColors()` unchanged, called once at the `MonthView` level.**
`categoryColors` is already computed at `MonthView.tsx:53-56` from all `categories`, not just the
selected month's. Pass the same `Map<number, string>` to both the sidebar breakdown and the new
flat list rows, so a category's color is guaranteed identical in both places without a second
source of truth. The existing palette strings already carry both background and text classes
(`bg-*-100 text-black dark:bg-*-900 dark:text-white`), which apply directly as a row's
`className`, same pattern already used at `MonthView.tsx:353`.

**Dialog: a small local `ConfirmDialog` component, not a portal-based modal library.** Given the
app has zero existing dialog infrastructure and only one call site pattern (confirm exclude/include
with a reason), the simplest correct option is a component rendered inline in the React tree with
`position: fixed` overlay + centered panel (similar footprint to `EditTransactionPanel`, which
already renders as an overlay-style panel from `MonthView.tsx:365-372` — follow that existing
pattern rather than introducing a new one). Alternative considered: pull in a headless UI library
(Radix Dialog) — rejected; a single confirm-with-textarea dialog doesn't justify a new dependency
for a codebase using plain React 19 with no existing component library.

**Dialog is controlled by `MonthView`'s local state, keyed by `{ categoryId, month, action }`.**
Mirrors the existing `editingTx` pattern (`MonthView.tsx:50`, `365-372`): a single
`exclusionDialog: { categoryId: number; mode: 'exclude' | 'include' } | null` state variable.
Opening it for `mode: 'include'` looks up the current `AverageExclusion.reason` for that
`(categoryId, month)` from the existing `exclusions` array (`useExclusions()`,
`MonthView.tsx:45`) to pre-fill the textarea. Confirming calls `setExclusion`/`removeExclusion`
exactly as `toggleExclusion` does today, then closes the dialog; errors still surface via the
existing `showErrorToast` (`MonthView.tsx:47`, `174-176`).

**"Excluded from averages" badge moves to the sidebar breakdown row.** Since the category card
that hosted the badge (`MonthView.tsx:247-251`) is removed, the badge is redrawn next to the
category name in the "По категоріях" row where the exclude control now lives — the natural place
since that's also where a user discovers/toggles exclusion. The flat transaction list does not
repeat the badge per-row (would be noisy at the transaction level); this satisfies the spec's
"remains visible" requirement without duplicating it.

## Risks / Trade-offs

- [Removing category grouping loses the "at a glance category subtotal while browsing
  transactions" view] → The "По категоріях" sidebar already shows every category's subtotal at
  all times (not just on scroll), so the information isn't lost, only relocated to a
  permanently-visible panel instead of an on-scroll card.
- [Date-header-grouped flat list with many same-day transactions could look cluttered without a
  category label per row] → Row background color plus category color consistency with the sidebar
  is intended to substitute for the explicit category header; if this proves insufficient in
  practice, a small category-name label per row remains an easy follow-up (not blocking this
  change).
- [New `ConfirmDialog` component, however small, is new surface area/first modal in the app] →
  Scoped tightly to this one use case (confirm + optional reason) to keep it simple; not designed
  as a general-purpose primitive, so it should not need generalization work later than expected.
- [Secondary sort key `id` descending as a proxy for "recently added" could be wrong if ids are
  ever reused/reset or transactions are backfilled with old ids for old dates] → Acceptable given
  current data (ids are Supabase-generated and monotonically increasing); flagged here so it's a
  conscious choice, not an oversight.

## Migration Plan

Purely additive/UI change against existing tables — no schema migration. Deploy as a normal
frontend release. Rollback is reverting the `MonthView.tsx` change; `AverageExclusion` rows are
unaffected by the toggle-location change since `setExclusion`/`removeExclusion` signatures are
unchanged.

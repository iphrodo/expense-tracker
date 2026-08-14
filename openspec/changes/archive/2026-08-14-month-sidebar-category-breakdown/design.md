## Context

See proposal.md - Why. Relevant current state:

- `Category` is `{ id: number, name: string, isDaily: boolean }` (`src/db/schema.ts`) — no color
  field, and no color concept exists anywhere in the codebase today (confirmed by search).
- `MonthView.tsx` already computes a `grouped` memo (`Map<categoryId, Transaction[]>`) for the
  selected month, sorted by category name, with a per-category `subtotal`. The daily/non-daily
  split needed for this change is a filter of that same map by `categoryById.get(id).isDaily`.
- The reference screenshot (a Google Sheets tracker) hand-assigns a distinct, thematically loose
  color per category (food = yellow/orange family, home/health/recurring = green, treats/luxury =
  purple/pink, etc.). That mapping is manual and reflects one person's taste, not a rule that
  generalizes to categories added later.

## Goals / Non-Goals

**Goals:**
- Every category gets a visually distinct row color with zero manual setup, including categories
  created after this change ships.
- No database schema change and no new settings UI in this change.

**Non-Goals:**
- Reproducing the exact hue-per-category from the screenshot. The screenshot's palette is a
  reference for *style* (distinct, moderately saturated background tints per row), not a
  category→color lookup table this spec commits to.
- Letting the user customize a category's color. If that's wanted later, it's a separate change
  (would need a schema addition and settings UI).

## Decisions

**Decision: deterministic hash-based color assignment, not a stored color field.**

Each category is mapped to a color by hashing a stable identifier (category `id`, not `name` —
names can be edited, ids can't) into an index over a fixed palette (`palette[hash(id) % palette.length]`).
This is computed at render time in a small pure helper, not persisted anywhere.

Alternatives considered:
- **Add a nullable `color` column to `Category`.** Rejected for this change: requires a schema
  migration and either a manual color-picker UI or a seed/backfill script to populate existing
  categories, none of which the proposal asks for. Revisit if the user later wants to hand-pick
  colors (e.g. to match their existing spreadsheet exactly) — the hash-based helper can stay as
  the default for categories with no explicit color.
- **Fixed name→color lookup table (transcribing the screenshot).** Rejected: breaks silently for
  any category not in the table (new categories, renamed categories, categories with different
  casing/spelling than the sheet), which the "Requirement: Each category row has a deterministic
  display color" scenario for newly created categories explicitly rules out.

**Decision: palette size and distinctness.**

Use a fixed palette of ~10-12 background tints (reusing the app's existing Tailwind-based styling
approach — pick tints that read clearly in both light and dark mode, i.e. define via CSS tokens
already used elsewhere in the app, not hard-coded hex values). With `id % paletteLength`, two
categories can share a color once the category count exceeds the palette size; this is acceptable
because the row's category *name* is always shown alongside the color, so color is a scanning aid,
not the sole identifier.

**Decision: omit zero-transaction categories rather than showing all categories.**

Matches the existing month view's main list, which already only shows categories with activity
that month, and keeps the sidebar block's height proportional to what actually happened that
month rather than every category ever created.

## Risks / Trade-offs

- [Two categories collide on the same palette color once category count exceeds palette size] →
  Mitigated by always pairing color with the category name in the row; color is redundant coding,
  not the only signal.
- [Hash-based colors won't visually match the user's existing Google Sheets color scheme] →
  Accepted per Non-Goals; the screenshot is a style reference, not a literal mapping to reproduce.
- [Section totals could drift from the summary block's totals if computed independently] →
  Mitigated by requiring (in the spec) that section totals derive from the same underlying
  `grouped`/`isDaily` data the summary block already uses, not a second aggregation pass.

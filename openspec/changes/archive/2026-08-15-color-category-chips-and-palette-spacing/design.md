## Context

`src/lib/categoryColor.ts` exports `assignCategoryColors(categoryIds)`, which sorts ids ascending
and maps each to `PALETTE[index % PALETTE.length]`. `PALETTE` is 17 Tailwind hue pairs in rainbow
order: red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet,
purple, fuchsia, pink, rose. Only `MonthView.tsx`'s "По категоріях" sidebar consumes this map today.
`CategorySelector.tsx` (quick-access chips + type-ahead + "more" search) renders categories with no
color at all — chips use a neutral border, with emerald reserved for the "selected" state. See
proposal.md for why this is a problem.

## Goals / Non-Goals

**Goals:**
- Reorder `PALETTE` so that any two adjacent indices are hue-distinct, without changing the
  deterministic, id-index-based, DB-free assignment strategy.
- Reuse `assignCategoryColors` in `CategorySelector.tsx` so chips and search results carry the same
  color as the sidebar for a given category.
- Keep the "selected chip" and "highlighted match" affordances legible against an arbitrary
  background color from the palette.

**Non-Goals:**
- Do not introduce a stored/configurable per-category color (proposal explicitly keeps this
  client-computed).
- Do not change how many colors are in the palette, or the color-scale shades used (100/800 light,
  900/200 dark) — only the *order* of hues in the array.
- Do not change chip ordering/ranking logic (`categoryRanking.ts`) or the type-ahead/search
  matching logic itself.

## Decisions

**Re-spacing strategy: interleave by fixed stride instead of hand-picking hues.**
With 17 palette entries, reordering by a stride that is coprime with 17 (any stride works, since 17
is prime) visits every hue exactly once while maximizing the hue-wheel distance between
consecutive output positions. Using a stride of 6 on the existing rainbow-ordered array (0-indexed:
red=0 ... rose=16) produces the sequence:
`red(0), teal(7), fuchsia(14), yellow(3), sky(9), purple(13), lime(4), rose(16), amber(2), indigo(11), green(5), pink(15), blue(10), orange(1), violet(12), cyan(8), emerald(6)`
(computed as `order[k] = (k * 6) % 17` for k = 0..16, mapped back onto the current hue names).
This keeps the same 17 hues and shade classes, just permuted, so it's a one-line change to the
array literal plus updating the existing snapshot-style tests in `categoryColor.test.ts` to match
the new order. Alternative considered: manually curate an order by eyeballing a color wheel —
rejected because it's harder to verify/maintain and a modular stride is simple to explain and to
re-derive if the palette size ever changes.

**Where color is consumed in `CategorySelector.tsx`.**
`CategorySelector` currently receives `categories` (or an equivalent list) as a prop already, since
it renders names for chips/matches. Compute `const categoryColors = useMemo(() =>
assignCategoryColors(categories.map(c => c.id)), [categories])` inside `CategorySelector` itself
(mirroring `MonthView.tsx`'s existing pattern) rather than threading a color map down from
`ExpenseEntryForm`/`EditTransactionPanel` as a new prop — this keeps the color concern local to the
one component that needs it and avoids widening the props of both callers. Apply
`categoryColors.get(c.id)` as the row/chip background classes; keep the selected-chip and
highlighted-match distinction via an added ring/border/font-weight utility layered on top of the
color classes, rather than swapping to a different fixed color (e.g. emerald) which would clash
with the category's own color.

**Selected/highlighted state layering.**
Today "selected" replaces the neutral classes with emerald ones. With per-category color in place,
"selected" instead adds a ring (`ring-2 ring-offset-1` or similar) and bold/underline treatment on
top of the category's own background color, so the chip's identity color stays visible while the
selection state remains distinguishable without a hardcoded emerald override.

## Risks / Trade-offs

- [Existing `categoryColor.test.ts` assertions pin exact palette values/order] → Tests are expected
  to change as part of this work (already called out in proposal.md's Impact); update them to
  assert the new order or, better, assert the *distinctness* property (no two adjacent indices
  share a hue family) so future palette edits don't require re-pinning exact strings.
- [Coloring every chip/dropdown row adds visual density to the entry form, which is optimized for
  fast keyboard-only batch entry] → Keep the color as a background tint only (existing pastel
  100/900 shades), not a bordering/saturated treatment, so it doesn't compete with the text or slow
  down scanning; this matches the existing sidebar treatment which already uses the same subtlety.
</content>

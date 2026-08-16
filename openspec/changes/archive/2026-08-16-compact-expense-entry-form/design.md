## Context

The entry form's row composition genuinely differs between mobile and desktop — not just a
reordering of the same elements, but different groupings (mobile: amount+Save / chips / date+note+All;
desktop: amount+date+note+Save / chips+All categories). See proposal.md - Why for the motivation.
The two obvious approaches — a single shared DOM tree repositioned per breakpoint, or two fully
separate mounted trees (one per breakpoint, CSS-toggled, matching how `App.tsx` already duplicates
its mobile nav vs. desktop header) — trade off differently here because several of the form's
controls are stateful, single-focus native inputs (the amount field, the native date input, the
note input), where a duplicate-mount approach risks duplicate refs, split focus, and duplicate
`autoFocus`/`showPicker()` behavior.

## Goals / Non-Goals

**Goals:**
- One live DOM tree, one instance of every interactive control (amount input, native date input,
  note input, Save button, category chips, "All" picker) — no duplicate-mount ref/focus hazards.
- Exact row/column composition specified in the proposal at both breakpoints.

**Non-Goals:**
- Pixel-identical reproduction of every dimension in the visual reference; token-scale values
  (spacing, radius, shadow) take precedence where they conflict with a literal pixel value.
- Any change to `EditTransactionPanel.tsx`'s layout or behavior.

## Decisions

- **Single CSS Grid with breakpoint-swapped `grid-template-areas`**, rather than duplicated JSX
  trees. The grid's `grid-template-columns`/`grid-template-areas` are redefined at the 900px
  breakpoint via an arbitrary Tailwind variant (`min-[900px]:...`), the same technique the
  pre-existing form already used for its (looser) mobile/desktop split. This keeps every
  interactive element mounted exactly once.
  - Alternative considered: flex-wrap with `order` and `flex-basis:100%` line breaks. Rejected —
    it cannot express "chips and the All-categories pill share a line on desktop, but chips alone
    occupy their own line on mobile" without either duplicating the All-picker trigger or nesting
    it inside a wrapper that would need to also be an independent grid item on desktop.
- **`display:contents` on the mobile "meta" wrapper.** On mobile, the date segment, "+ note" pill,
  and "All" pill are visually one flex row inside a single wrapper `<div>` (grid-area `meta`). On
  desktop, those three controls need to become independent grid items (areas `date`, `note`, `all`)
  in different grid cells. `display:contents` on the wrapper at the desktop breakpoint removes the
  wrapper's own box without unmounting its children, so they become direct grid children and pick
  up their own `min-[900px]:[grid-area:...]` placement — no duplicate DOM nodes, no duplicate refs.
- **The note's expanded input lives outside the grid**, as a plain conditional sibling row in the
  card's outer `flex-col`, rather than occupying a grid area. Its position is identical at both
  breakpoints (always the last row when open), so it does not need grid placement, and this avoids
  needing a 4th named area that would otherwise sit unused in the collapsed state.
- **`CategorySelector.tsx` decomposition.** Extracted `useCategoryChips` (chip-list-with-promotion),
  `CategoryChipsRow`, and `CategoryAllPicker` as independently placeable pieces so the entry form
  can position the chip row and the "All" trigger in different grid cells per breakpoint, while
  keeping a combined `CategorySelector` wrapper (chips + picker in one wrapping flex row) for
  `EditTransactionPanel.tsx`, which does not need the responsive split and was left otherwise
  unchanged.
- **`CategoryAllPicker` bottom-sheet/dropdown via one CSS-responsive panel**, not two separately
  positioned panels. The panel is `fixed inset-x-0 bottom-0` (mobile sheet) and switches to
  `absolute` anchored under the trigger at the 900px breakpoint — one DOM node, one piece of state.

## Risks / Trade-offs

- [Grid items default to `min-width: auto`, which sizes to their content's min-content width] →
  the category chip row's `white-space: nowrap` chips have a large min-content width (the sum of
  every chip), which was found during implementation to force the grid track — and the whole card —
  wider than the viewport on mobile, pushing the "+ note"/"All" pills out of view. Mitigated by
  adding `min-w-0` to the chip row's grid item, the `amount` grid item, the `meta` wrapper, and the
  grid container itself. Verified with a real headless-browser check of `boundingBox()` and
  `scrollWidth` at 390px before/after the fix.
- [`display:contents` has known accessibility quirks in some older browser/AT combinations
  (e.g. list semantics can be lost on `contents` elements in a few browsers)] → the wrapper here has
  no semantic role of its own (a plain layout `div`), so there is no semantic information to lose;
  its children remain normal focusable buttons/inputs either way.

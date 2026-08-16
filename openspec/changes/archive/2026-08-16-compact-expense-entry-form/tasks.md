## 1. Category selector decomposition

- [x] 1.1 Extract `useCategoryChips` (top-N-by-rank chip list, with the selected category promoted
      to the front when it would otherwise fall outside that slice) out of the old combined
      `CategorySelector`.
- [x] 1.2 Extract `CategoryChipsRow` as its own component, with a `scroll` prop toggling between a
      single-line horizontally-scrolling row (fading right edge via `mask-image`, hidden scrollbar)
      and the wrapping layout still used by the edit-transaction modal.
- [x] 1.3 Replace the old inline "more…" search dropdown with `CategoryAllPicker`: a trigger pill
      ("All" / "All categories") plus a searchable panel (bottom sheet on mobile, dropdown anchored
      under the trigger on desktop via the same 900px breakpoint), preserving keyboard navigation
      (arrow keys + Enter) and inline "Create "<query>"" category creation.
- [x] 1.4 Keep a combined `CategorySelector` wrapper (chips + `CategoryAllPicker` in one wrapping
      flex row) for `EditTransactionPanel.tsx`, unchanged from its prior behavior/props contract.

## 2. Entry form responsive layout

- [x] 2.1 Rebuild `ExpenseEntryForm.tsx` on a single CSS Grid whose `grid-template-columns` /
      `grid-template-areas` swap at the 900px breakpoint, so every interactive control (amount
      input, native date input, note input, Save button) is mounted exactly once.
- [x] 2.2 Mobile layout: row 1 = amount (flex) + Save (84px); row 2 = single scrolling chip row;
      row 3 (`meta` grid area, a `display:contents` wrapper at desktop) = date segmented control +
      "+ note" pill (`margin-left:auto`) + "All" pill.
- [x] 2.3 Desktop layout (≥900px): row 1 = amount (260px) + date segment + note pill + Save (120px,
      pushed right via a spacer grid column); row 2 = chip row + "All categories" pinned to the row's
      right end.
- [x] 2.4 Remove the always-visible "Category (type to search)" field and the separate resolved-date
      caption line; the date segmented control's third segment now shows the resolved short date
      (e.g. `15.08`) and opens the native date picker.
- [x] 2.5 Collapse the note field by default; "+ note" expands a single-line, borderless-until-focus
      input as a conditional row outside the grid, collapsing again after save.
- [x] 2.6 Fix grid items' default `min-width: auto` forcing the card wider than the viewport on
      mobile (the chip row's `white-space: nowrap` content was pushing "+ note"/"All" off-screen) by
      adding `min-w-0` to the chip row, amount, and meta grid items and to the grid container.

## 3. Verification

- [x] 3.1 `tsc --noEmit` and `npm run build` pass with no new type or build errors.
- [x] 3.2 Full existing test suite (69 tests) passes unchanged.
- [x] 3.3 Verified in a real headless browser (Playwright, against the built component markup/CSS)
      at 390px: form height ≤160px with 3 rows (4 while the note is open), category chips confined
      to one scrolling line, and `+ note`/`All` render with `white-space: nowrap` and no visual
      wrapping.
- [x] 3.4 Verified in a real headless browser at 1280px: 2-row layout with Save and "All categories"
      pinned to the right, matching the visual reference (`Screens.dc.html`).
- [x] 3.5 Verified the real app (behind auth) still renders with no console errors after the change.

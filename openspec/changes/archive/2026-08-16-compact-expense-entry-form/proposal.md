## Why

The add-expense form is a permanent fixture pinned above the transaction list — its height is paid
on every visit to the Month view, on every device. After `redesign-visual-refresh` landed the new
visual tokens, the form still spanned roughly six stacked rows (amount+Save, two wrapping rows of
category chips, an always-visible category search field, a date segmented control, a resolved-date
caption line, and an "Add note" link), pushing the transaction list further below the fold than
its actual information density warrants. This change compacts the form to three rows on mobile
(≤160px tall) and two rows on desktop, without changing any save/date/note/category-selection
behavior, labels, or category names.

## What Changes

- Rebuilt the entry form's layout as a single responsive CSS Grid: 3 rows on mobile (amount+Save;
  one horizontally-scrolling line of category chips; a meta row with the date segment, a "+ note"
  pill, and an "All" pill), collapsing to 2 rows at a 900px breakpoint (amount+date+note+Save; chips
  + "All categories" pinned to the row's right end).
- Category quick-pick chips now render on a single non-wrapping, horizontally-scrolling line (with
  a fading right edge) instead of wrapping onto a second row.
- Removed the always-visible "Category (type to search)" field and the separate resolved-date
  caption line beneath the date control; the third date-segment button now shows the resolved date
  directly (e.g. `15.08`) and doubles as the trigger for the native date picker.
- Replaced the inline "more…" search dropdown with a dedicated "All" / "All categories" picker: a
  trigger pill that opens a full searchable category list — a bottom sheet on mobile, a dropdown
  anchored under the trigger on desktop — with keyboard navigation and inline category creation, as
  before. Picking a category there promotes it into the visible chip row.
- The note field remains collapsed by default; "+ note" now expands a single-line input as an
  optional fourth row instead of a bare "Add note" text link, and it collapses again after save.
- `CategorySelector.tsx` was decomposed into reusable pieces (`useCategoryChips`,
  `CategoryChipsRow`, `CategoryAllPicker`) so the entry form can place the chip row and the "All"
  picker independently across its responsive layout, while the edit-transaction modal keeps using a
  single combined `CategorySelector` wrapper unchanged.
- No functionality, data flow, category names, or Ukrainian labels changed — this is purely a
  layout, sizing, and component-structure change on top of the tokens `redesign-visual-refresh`
  already established.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `expense-entry`: the category quick-pick/search requirement and the category-color requirement
  both need their wording updated from the old two-row-chips-plus-"more"-dropdown model to the new
  single-scrolling-row-plus-"All"-picker model; a new requirement documents the compact,
  height-bounded row layout itself.

## Impact

- `src/features/entry/ExpenseEntryForm.tsx` — full layout rewrite (responsive CSS Grid).
- `src/features/entry/CategorySelector.tsx` — decomposed into `useCategoryChips`,
  `CategoryChipsRow`, `CategoryAllPicker`, plus a `CategorySelector` wrapper that composes them for
  `EditTransactionPanel.tsx` (which itself is unchanged).
- `src/index.css` — added `.chip-scroll` scrollbar-hiding utility for the chip row.
- Builds on the design tokens and category `dot`/`tint`/`text` color roles introduced by the
  still-open `redesign-visual-refresh` change; does not modify that change's files.

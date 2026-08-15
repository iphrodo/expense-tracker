## Why

Category colors currently only appear in the Month view's "По категоріях" sidebar breakdown, and even there many neighboring categories look nearly identical because colors are assigned by sorted category-id index into a rainbow-ordered palette (`src/lib/categoryColor.ts`), so adjacent indices often land on perceptually close hues (amber/yellow/lime, teal/cyan/sky). Meanwhile the entry form's quick-access category chips and category search/dropdown (`CategorySelector.tsx`) render as plain uncolored outlined pills, so a user can't visually match "Продукти" in the entry form to "Продукти" in the sidebar. This makes both surfaces harder to scan at a glance.

## What Changes

- Re-space the palette in `src/lib/categoryColor.ts` so adjacent palette indices are maximally distinct in hue, instead of following rainbow order — same fixed, deterministic, client-side-only palette mechanism, just reordered.
- Apply the same deterministic per-category color (via `assignCategoryColors`) to the quick-access category chips and to rows in the category search/typeahead dropdown in `CategorySelector.tsx`, so a given category shows the same color in the entry form as it does in the sidebar breakdown.
- No new persistence: colors remain purely computed client-side from category id, with no DB column and no per-category user configuration.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `expense-analytics`: the existing "Each category row has a deterministic display color" requirement is extended to require that adjacent palette entries be visually distinct (not just deterministic), and that the same color mapping used in the sidebar breakdown is also the one used anywhere else a category is displayed with color.
- `expense-entry`: adds a new requirement that the quick-access category chips and the category search/typeahead dropdown render each category with its deterministic display color, consistent with the sidebar breakdown.

## Impact

- `src/lib/categoryColor.ts` — reordered/re-spaced palette array (same function signature, same deterministic id-index assignment strategy).
- `src/lib/categoryColor.test.ts` — existing tests asserting specific palette values/order will need updating to match the new ordering.
- `src/features/entry/CategorySelector.tsx` — quick-access chips and typeahead/"more" search dropdown rows gain per-category color styling, sourced from `assignCategoryColors`.
- `src/features/entry/ExpenseEntryForm.tsx` and `src/features/entry/EditTransactionPanel.tsx` — both render `CategorySelector`; need to supply the full category list (already available) so `assignCategoryColors` can compute a stable mapping.
- `src/features/analytics/MonthView.tsx` — no behavior change; continues to consume `assignCategoryColors` for the sidebar breakdown.

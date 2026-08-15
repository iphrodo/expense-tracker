## 1. Re-space the palette

- [x] 1.1 Reorder `PALETTE` in `src/lib/categoryColor.ts` using the stride-6 permutation described
      in design.md (`order[k] = (k * 6) % 17`), keeping the same 17 hue/shade entries.
- [x] 1.2 Update `src/lib/categoryColor.test.ts` to match the new order (or, preferably, replace
      exact-value pinning with an assertion that no two adjacent palette entries share a hue
      family).

## 2. Color the entry form's category chips

- [x] 2.1 In `CategorySelector.tsx`, compute `categoryColors` via `assignCategoryColors` over the
      full category list already available to the component (mirroring `MonthView.tsx`'s usage).
- [x] 2.2 Apply each chip's `categoryColors.get(c.id)` background/text classes to the quick-access
      chip buttons, replacing the current plain neutral-outline styling.
- [x] 2.3 Replace the current "selected chip" emerald-override styling with a ring/border/weight
      treatment layered on top of the category's own color, so selection stays visible without
      hiding the category's color.

## 3. Color the category search results

- [x] 3.1 Apply `categoryColors.get(c.id)` to each row in the keyboard type-ahead match list.
- [x] 3.2 Apply `categoryColors.get(c.id)` to each row in the "more" search dropdown match list.
- [x] 3.3 Adjust the highlighted-match styling (currently `bg-emerald-500/10`) to layer on top of
      the category's color rather than override it.

## 4. Verify

- [x] 4.1 Run the test suite (`categoryColor.test.ts` and any `CategorySelector`/`MonthView` tests)
      and confirm they pass with the new palette order and chip/dropdown coloring.
- [x] 4.2 Manually check in the running app that a given category (e.g. "Продукти") shows the same
      color in the entry form chips, the search dropdown, and the sidebar "По категоріях" block,
      and that adjacent-category colors in the sidebar are visibly distinct.
      (Verified via a scratch RTL render asserting chip/typeahead classNames equal
      `assignCategoryColors` output for the same ids, since `MonthView` already consumes the same
      function — couldn't reach the running app's UI directly as it requires the user's own
      Supabase login. User should spot-check visually in the browser.)
</content>

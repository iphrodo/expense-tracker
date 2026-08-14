## 1. Category color helper

- [x] 1.1 Add a small pure helper (e.g. `src/lib/categoryColor.ts`) that maps a category `id` to a
      color from a fixed palette via `palette[hash(id) % palette.length]`, with a simple, stable
      hash (e.g. a basic string/int hash — no external dependency needed)
- [x] 1.2 Define the fixed palette as CSS-token-based Tailwind classes (background + text) that
      render legibly in both light and dark mode, reusing tokens already used elsewhere in the app
      rather than hard-coded hex values
- [x] 1.3 Add a couple of unit tests for the helper: same id always returns the same color; ids
      spanning more than the palette length wrap around without erroring

## 2. Per-category breakdown data

- [x] 2.1 In `MonthView.tsx`, derive the daily/non-daily split from the existing `grouped` memo and
      `categoryById`/`category.isDaily` — no new transaction aggregation, just partitioning
      `grouped`'s entries by `isDaily` and reusing each entry's existing subtotal
- [x] 2.2 Sort categories within each section by name, matching the existing `grouped` sort order
- [x] 2.3 Compute each section's total as the sum of that section's category subtotals, and verify
      it equals the corresponding "Щоденні витрати всього" / "Не щоденні витрати всього" value
      already shown in the summary card (same underlying numbers)
- [x] 2.4 Omit categories with no transactions in the selected month (no zero rows)

## 3. Sidebar UI

- [x] 3.1 Add a third card to the month view's right sidebar, below the existing summary and
      "Детально" cards, with a heading (e.g. "По категоріях")
- [x] 3.2 Render the two sections ("Щоденні витрати" / "Не щоденні витрати") with a section header
      showing the section total, and one row per category showing name + signed sum
- [x] 3.3 Apply the category color helper's background/text classes to each row
- [x] 3.4 Verify signed amounts (including refunds/negative transactions) display correctly in row
      sums and section totals, consistent with the summary card's existing handling

## 4. Verification

- [x] 4.1 Manually check the month view for a month with data in both `isDaily` and non-`isDaily`
      categories, confirming section totals match the summary card
- [x] 4.2 Manually check a category with a negative (refund) transaction shows the reduced sum
- [x] 4.3 Manually check switching selected month updates the block without a reload, consistent
      with existing month view behavior
- [x] 4.4 Run `npm run lint` / existing test suite and fix any failures introduced by this change

## Why

The month view's right sidebar currently shows a totals summary and a fixed two-group daily-average
breakdown ("тільки їжа" / "солодке+алк+чіпси"), but neither shows spend per individual category for
the selected month. The user wants a per-category breakdown block, split into "Щоденні витрати" and
"Не щоденні витрати" sections with each category visually color-coded (matching the style of an
existing Google Sheets tracker), so they can scan which specific categories drove the month's total
without opening the main transaction list.

## What Changes

- Add a third sidebar card to the month view, below the existing "summary" and "Детально" cards,
  titled to reflect its content (e.g. "По категоріях").
- The card lists every category that has at least one transaction in the selected month, split into
  two sections: "Щоденні витрати" (categories with `isDaily: true`) and "Не щоденні витрати"
  (`isDaily: false`), each row showing the category name and its signed sum for the month.
- Each section header also shows a section total, which SHALL equal the corresponding
  "Щоденні витрати всього" / "Не щоденні витрати всього" figure already shown in the summary card
  (same underlying sums, not recomputed independently).
- Each category row is rendered with a distinct background/accent color, deterministically derived
  from the category (no new user-facing color picker or settings UI in this change).
- Categories within each section are sorted by name, consistent with the existing `grouped` sort
  order used elsewhere in `MonthView.tsx`.
- A category with no transactions in the selected month is omitted from the block (no zero rows),
  consistent with how the main transaction list already only shows categories with activity that
  month.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `expense-analytics`: adds a new sidebar requirement — a per-category breakdown block, split by
  `isDaily`, with deterministic per-category coloring and signed-amount handling consistent with
  the existing summary and Детально blocks.

## Impact

- `src/features/analytics/MonthView.tsx`: add a third sidebar card, deriving its data from the
  existing `grouped` memo (`Map<categoryId, Transaction[]>`), `categoryById`, and
  `category.isDaily` — no new aggregation logic beyond splitting `grouped` by `isDaily` and summing
  each bucket.
- A new small module for deterministic category → color mapping (hash of category name/id into a
  fixed palette), with no database schema change (`Category` stays `{ id, name, isDaily }`). See
  `design.md` for the color-mapping approach and alternatives considered.
- No changes to `src/db/schema.ts`, `src/lib/averages.ts`, or any write path.

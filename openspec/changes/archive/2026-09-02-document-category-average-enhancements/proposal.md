## Why

The category averages table previously hid the actual spend behind exclusion-adjusted averages and
overstated the recurring monthly cost of long-lived equipment. It also required mentally combining
six food-related categories to understand total food spending.

## What Changes

- Add a per-category total for the complete-month reporting period that ignores category-average
  exclusions.
- Keep a category visible with its period total even when every one of its months is excluded from
  its average.
- Treat purchases in the exact `Техніка` category as five-year assets and spread their eligible
  signed spend over 60 months when calculating the category's monthly average.
- Add a separate `Харчування` summary that combines `Продукти`, `Іжа в закладі`, `Іжа на виніс`,
  `Алкоголь`, `Снеки`, and `Солодке`, showing both an exclusion-independent period total and the sum
  of the component categories' exclusion-aware monthly averages.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `expense-analytics`: Extend category averages with actual period totals, equipment lifetime
  smoothing, and a separate combined food summary.

## Impact

- `src/lib/averages.ts`: category-average result shape and food-summary computation.
- `src/features/analytics/AveragesView.tsx`: category table columns, divisor display, and food
  summary presentation.
- `src/lib/averages.test.ts`: unit coverage for totals, exclusions, equipment smoothing, refunds,
  and the food aggregate.
- No database schema, persistence format, or dependency changes.

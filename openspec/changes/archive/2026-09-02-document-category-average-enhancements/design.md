## Context

See `proposal.md` for motivation. Category averages are produced by a pure function and rendered
directly by the averages view. The same result must now carry both the exclusion-adjusted numerator
used for an average and the actual complete-period total used for reporting. Categories are user
data and currently have no type or lifetime metadata beyond their names and `isDaily` flag.

## Goals / Non-Goals

**Goals:**

- Preserve the existing complete-month and category-exclusion semantics for ordinary averages.
- Keep actual reporting totals separate from exclusion-adjusted average inputs.
- Make the exceptional 60-month equipment divisor visible rather than implicit.
- Derive the food summary from already-computed category rows so it cannot drift from their
  exclusion behavior.

**Non-Goals:**

- Adding category groups, asset lifetimes, or amortization schedules to the database.
- Supporting a different lifetime per equipment transaction.
- Expiring equipment purchases after a rolling 60-month window.
- Changing the all-time historical summary card or the month projection formula.

## Decisions

### Carry two totals in each category-average result

The result keeps the existing exclusion-adjusted `total` for average calculation and adds
`periodTotal`, summed from all signed transactions in complete months without consulting
`AverageExclusion`. Rows are based on period totals rather than adjusted totals, which keeps a
fully excluded category visible.

This is preferred to reconstructing totals in the component because the complete-month policy
belongs in the pure analytics layer and can be unit-tested there.

### Identify the equipment exception by exact category name

Category metadata has no asset class or lifetime field, so the exact name `Техніка` selects a
fixed `5 * 12` divisor. The result exposes `averageDivisorMonths`; ordinary rows set it to
`monthsCounted`, while equipment sets it to 60. The view displays this value next to the average.

Adding persisted lifetime metadata would be more flexible, but would require a database migration,
editing UI, backup-format changes, and defaults for existing data. That is unnecessary for the
single requested exception.

### Compose food average from component averages

The food total sums `periodTotal` for the six exact category names. Its monthly average sums each
matching row's already-computed average instead of pooling adjusted totals under a new divisor.
This preserves per-category exclusions and divisors independently. A food category without a
computable average contributes to the total but not to the aggregate monthly average.

The summary is rendered as its own card rather than inserted as a synthetic category row, keeping
the fixed grouping distinct from editable categories and category sorting.

## Risks / Trade-offs

- **Name coupling:** Renaming `Техніка` or any food category stops it matching the special rule.
  → Keep exact names centralized in the analytics module and cover them with unit tests.
- **Uniform equipment lifetime:** Small accessories and major devices receive the same five-year
  treatment. → Accept the deliberately simple rule until per-category or per-transaction lifetime
  configuration is requested.
- **No rolling expiry:** With more than five years of tracked history, old equipment remains in the
  eligible numerator. → Treat a rolling asset window as a future behavior change requiring its own
  decision and tests.
- **Food categories with different exclusions:** The aggregate cannot truthfully show one shared
  month count. → Display only its total and composed monthly average, without a months-count label.

## Migration Plan

No data migration is required. Deploy the pure calculation and view changes together. Rollback is
the inverse code deployment; stored transactions, exclusions, and backups remain compatible.

## 1. Category period totals

- [x] 1.1 Extend each category-average result with a signed complete-period total that does not
      apply `AverageExclusion` records
- [x] 1.2 Build rows from period totals so a fully excluded category remains visible with a null
      average
- [x] 1.3 Add the `TOTAL` column to the category averages table

## 2. Equipment lifetime averaging

- [x] 2.1 Pass category metadata into the category-average computation and identify the exact
      `Техніка` category
- [x] 2.2 Use a fixed 60-month divisor for eligible signed equipment spend while preserving the
      ordinary per-category divisor for every other category
- [x] 2.3 Expose and display the actual average divisor so the equipment row communicates its
      five-year treatment

## 3. Combined food summary

- [x] 3.1 Aggregate `Продукти`, `Іжа в закладі`, `Іжа на виніс`, `Алкоголь`, `Снеки`, and
      `Солодке` by exact category name
- [x] 3.2 Sum exclusion-independent period totals and independently computed exclusion-aware
      monthly averages for the food aggregate
- [x] 3.3 Render `Харчування` as a separate averages-view card with total and monthly-average values

## 4. Verification

- [x] 4.1 Add Vitest coverage for period totals with exclusions, fully excluded rows, equipment
      lifetime smoothing with a refund, and the food aggregate
- [x] 4.2 Run the averages unit tests successfully (21 tests passing)
- [x] 4.3 Run the production TypeScript/Vite build successfully
- [x] 4.4 Run ESLint on the changed TypeScript and TSX files and run `git diff --check`

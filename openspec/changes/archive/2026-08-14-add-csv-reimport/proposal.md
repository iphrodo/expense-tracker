## Why

The seed import only accepts `/seed/transactions.csv` and skips any row whose `row_index` already
exists. When source data turns out to be wrong (e.g. a mis-entered December amount), there is no
way to correct it from a CSV: the user can produce a corrected file, but re-running import against
it changes nothing, because every already-seen `row_index` is silently skipped.

## What Changes

- Add a file picker to the Import/Export screen so the user can import an arbitrary CSV file from
  disk, in addition to the existing one-click seed import from `/seed/transactions.csv`.
- **BREAKING**: change import row handling from skip-on-existing-`row_index` to
  upsert-by-`row_index`: when an imported row's `row_index` matches an existing transaction, that
  transaction's `amountCents`, `date`, `categoryId`, and `note` are overwritten with the row's
  values instead of the row being skipped. Rows whose `row_index` is not yet present are inserted
  as before.
- Make the expected row-count/amount-sum assertion optional for file-picker imports: the picked
  file is imported without a caller-supplied expectation, while the existing one-click seed import
  keeps asserting against `SEED_IMPORT_EXPECTATIONS` as it does today.
- Import report distinguishes rows updated (upsert of an existing `row_index`) from rows newly
  created, replacing the current "skipped, already imported" count.

## Capabilities

### Modified Capabilities
- `data-import`: import no longer skips rows whose `row_index` already exists — it upserts them —
  and import can be run against a user-picked file, not only the fixed seed path.

## Impact

- `src/features/import/importer.ts`: replace skip logic with upsert logic; make
  `expectedRowCount`/`expectedAmountSum` optional in `ImportOptions`; change `ImportReport` shape.
- `src/db/repository.ts`: needs a way to look up existing transactions by `importRowIndex` (not
  just which indexes exist) so matched rows can be updated in place.
- `src/features/import/ImportExportScreen.tsx`: add a file input for picking a CSV from disk,
  wired to the same `importSeedCsv` (renamed/generalized) function.
- Existing tests in `src/features/import` (if any) and `src/db/repository.test.ts` covering
  idempotent skip behavior need to be updated to assert upsert behavior instead.

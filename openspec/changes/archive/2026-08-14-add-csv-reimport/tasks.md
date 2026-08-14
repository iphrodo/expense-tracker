## 1. Repository layer

- [x] 1.1 Replace `getExistingImportRowIndexes` with `getExistingImportedTransactions(): Promise<Map<number, Transaction>>` keyed by `importRowIndex` in `src/db/repository.ts`
- [x] 1.2 Update `src/db/repository.test.ts` for the new function

## 2. Importer logic

- [x] 2.1 Make `expectedRowCount` and `expectedAmountSum` optional on `ImportOptions` in `src/features/import/importer.ts`; skip the assertion block when either is `undefined`
- [x] 2.2 Change `ImportReport` to `{ categoriesCreated, transactionsCreated, transactionsUpdated }`
- [x] 2.3 Replace the skip-existing filter with upsert logic: for rows matching an existing `importRowIndex`, call `db.transactions.update(...)` with the row's `amountCents`, `date`, `categoryId`, `note`; for unmatched rows, insert as before — both within the existing `db.transaction('rw', ...)` block
- [x] 2.4 Update/rename exported function if needed so the same entry point serves both the seed import and picked-file import call sites (keep `SEED_IMPORT_EXPECTATIONS` for the seed call site)

## 3. UI

- [x] 3.1 Add a `<input type="file" accept=".csv">` control to `ImportExportScreen.tsx` for picking a file from disk
- [x] 3.2 Wire the file picker's `onChange` to read the file via `File.text()` and call the import function with no expectations
- [x] 3.3 Update the status message to report created vs. updated counts (both the seed-import and file-picker code paths)
- [x] 3.4 Add brief help text noting that re-importing overwrites existing transactions matched by `row_index`

## 4. Tests

- [x] 4.1 Update `src/lib/csv.test.ts` / importer tests covering "re-running import does not duplicate rows" to also assert upsert-on-change behavior (corrected amount/date/category/note overwrites the existing transaction)
- [x] 4.2 Add a test: importing a file with no expected row count/amount sum succeeds without assertion
- [x] 4.3 Add a test: malformed row in a picked file still fails loudly with no partial write

## 5. Verification

- [x] 5.1 Run lint, typecheck, and test suite
- [x] 5.2 Manually verify in the running app: seed import still works, then pick a corrected CSV file and confirm existing transactions update in place

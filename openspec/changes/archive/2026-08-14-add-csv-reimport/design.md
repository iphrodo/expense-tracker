## Context

`importSeedCsv` (src/features/import/importer.ts) currently: parses the CSV, asserts row count and
amount sum against caller-supplied expectations, creates missing categories, then inserts only the
rows whose `row_index` is not already present (`getExistingImportRowIndexes` returns a `Set` of
indexes; rows are filtered against it). The UI (`ImportExportScreen.tsx`) only ever calls this
against a `fetch('/seed/transactions.csv')` response with `SEED_IMPORT_EXPECTATIONS`. See
proposal.md for why this is a problem.

## Goals / Non-Goals

**Goals:**
- Correct existing transactions by re-importing a fixed CSV, keyed by `row_index`.
- Let the user pick any CSV file from disk for this purpose.
- Keep the original one-click seed import working exactly as before (assertions included).

**Non-Goals:**
- No diff/preview UI showing what will change before committing an upsert import — the report
  after import (created/updated counts) is sufficient for this change.
- No partial/selective import (e.g. "only rows for December") — the whole file is processed;
  scoping which rows to correct is done by the user curating the CSV file itself.
- No change to the export format or to `is_daily`/category-rename handling.

## Decisions

**Upsert by fetching existing transactions keyed by row_index, not just a Set of indexes.**
`getExistingImportRowIndexes` only returns *which* indexes exist, not the transaction records
behind them, so the importer can't update. Replace it with a function returning a `Map<number,
Transaction>` keyed by `importRowIndex` (e.g. `getExistingImportedTransactions`), covering both the
"is this new" check and the "what do I update" lookup in one query. Alternative considered: keep
the existing `Set`-returning function for the skip check and add a second lookup-by-id call inside
the loop — rejected as N+1 queries against Dexie for large files.

**Update in the same bulk transaction as inserts.** The existing `db.transaction('rw', ...)` block
that loops over rows to insert is extended to also call `db.transactions.update(...)` for matched
rows, so a re-import remains atomic: either the whole file's changes land, or none do (consistent
with the existing malformed-row-aborts-before-any-write behavior via up-front validation in
`parseSeedCsv`).

**Expectations become optional, not a separate function.** `ImportOptions.expectedRowCount` and
`expectedAmountSum` become optional fields; the assertion block is skipped when either is
`undefined`. Alternative considered: a separate `importCsv` (no assertions) vs `importSeedCsv`
(asserts) — rejected because it would duplicate the parse/upsert logic; a single function with
optional assertions is simpler and the seed path just always passes
`SEED_IMPORT_EXPECTATIONS`.

**File picker is a plain `<input type="file">`, read via `File.text()`.** No drag-and-drop, no
multi-file support — matches the one-shot, occasional nature of corrections. The picked file's text
is passed to the same import function used for the seed import, with no expectations supplied.

**Report shape:** `ImportReport` changes from `{ categoriesCreated, transactionsImported,
skippedAlreadyImported }` to `{ categoriesCreated, transactionsCreated, transactionsUpdated }`.
This is a breaking change to the return shape but the type is internal to this feature (only
consumed by `ImportExportScreen.tsx`), so no external migration is needed — just update the one
call site.

## Risks / Trade-offs

- **[Risk]** Upsert overwrites a transaction that the user has since hand-edited in the app (e.g.
  fixed a note via the edit screen) if that transaction's `row_index` reappears in a re-imported
  file. → **Mitigation**: this is inherent to the feature the user asked for (the CSV is the
  correction source of truth); no additional mitigation in this change. Documented in the seed
  import screen's help text so the behavior is not a surprise.
- **[Risk]** A picked file without expectations could be silently truncated (e.g. browser file read
  interrupted) with no row-count check to catch it. → **Mitigation**: `parseSeedCsv` already fails
  loudly on structurally malformed rows and a missing/extra trailing rows would show up in the
  reported created/updated counts, which the user can sanity-check against what they expect.

## Migration Plan

No data migration. This changes only application code (`importer.ts`, `repository.ts`, the import
screen). The existing `SEED_IMPORT_EXPECTATIONS`-driven one-click seed import keeps working
unchanged from the user's point of view, aside from the report wording (created vs. updated
instead of skipped).

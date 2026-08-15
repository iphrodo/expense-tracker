# data-import Specification

## Purpose

Moves nine months of transaction history out of the source spreadsheet into the app exactly once,
and keeps an escape hatch back out to CSV so the user is never locked into this app's storage.

## Requirements

### Requirement: Import upserts rows using row_index as the identity key
Running the import against a CSV file SHALL NOT create duplicate `Category` or `Transaction`
records for a `row_index` already present. The system SHALL use each row's `row_index` — not any
combination of `date`, `category`, `amount_eur`, or `note` — as the identity key for detecting a
row already imported. When a row's `row_index` matches an existing `Transaction`, the import SHALL
overwrite that transaction's `amountCents`, `date`, `categoryId` (creating the category first if
it does not yet exist), and `note` with the row's values, rather than skipping the row. When a
row's `row_index` does not match any existing `Transaction`, the import SHALL insert a new
`Transaction` as before.

#### Scenario: Re-running import with unchanged data leaves records equivalent
- **WHEN** the import has already run once successfully for a CSV file, and the user runs it again
  against the same, unmodified file
- **THEN** the count of `Transaction` and `Category` records after the second run equals the count
  after the first run, every `row_index` from the file is still represented by exactly one
  `Transaction`, and each transaction's fields are unchanged

#### Scenario: Re-importing a corrected file updates the matching transaction
- **WHEN** a `Transaction` was previously imported with a given `row_index`, and the user imports a
  CSV file containing a row with that same `row_index` but a different `amount_eur`, `date`,
  `category`, or `note`
- **THEN** the existing `Transaction` for that `row_index` is updated in place to the new values,
  no duplicate `Transaction` is created, and the import report counts the row as updated rather
  than newly created

#### Scenario: Legitimate same-value rows survive a re-run
- **WHEN** the CSV contains multiple rows sharing `date`, `category`, and `amount_eur` (as in a
  batched-cell expansion), and the import is run twice
- **THEN** all of those rows are present after the second run exactly once each, keyed by their
  distinct `row_index` values, with none dropped and none duplicated

### Requirement: Import optionally asserts expected row count and amount total
The import SHALL accept an optional expected row count and an optional expected sum of
`amount_eur`. When both are supplied, the import SHALL, after processing the file, compare the
number of data rows read and the sum of their `amount_eur` values against these expected values,
and SHALL fail loudly — reporting the expected and actual values — if either does not match,
rather than completing silently on a truncated or partially-read file. When the expectations are
omitted, the import SHALL skip this comparison and proceed using the row count and amount sum
actually read from the file.

#### Scenario: Matching count and sum completes successfully
- **WHEN** the import is invoked with an expected row count of 1763 and an expected amount sum of
  36442.17 EUR, and both match what is actually read from the file
- **THEN** the import completes and reports success

#### Scenario: Row count mismatch fails loudly
- **WHEN** the import is invoked with an expected row count that does not match the number of data
  rows actually present in the file
- **THEN** the import fails with an error stating the expected and actual row counts, and does not
  silently proceed as if the import were complete

#### Scenario: Amount sum mismatch fails loudly
- **WHEN** the import is invoked with an expected `amount_eur` sum that does not match the sum of
  `amount_eur` actually read from the file
- **THEN** the import fails with an error stating the expected and actual sums, and does not
  silently proceed as if the import were complete

#### Scenario: Import without expectations proceeds unconditionally
- **WHEN** the import is invoked without an expected row count or expected amount sum
- **THEN** the import processes all rows in the file without comparing counts or sums, and
  completes successfully provided no row is malformed

### Requirement: Import reports created, updated, and category counts, and fails loudly on malformed rows
On successful completion, the import SHALL report the number of categories created, the number of
transactions newly created, and the number of transactions updated (matched by `row_index` and
overwritten). If any row is malformed (e.g. unparseable `date`, non-numeric `amount_eur`, missing
`category`, or missing/duplicate `row_index`), the import SHALL fail with an error identifying the
offending row rather than silently skipping it.

#### Scenario: Successful import reports created, updated, and category counts
- **WHEN** the import completes with no malformed rows, some rows matching existing `row_index`
  values and others not
- **THEN** the system reports the number of categories created, the number of transactions newly
  created, and the number of transactions updated

#### Scenario: Malformed row aborts import with an error
- **WHEN** a row in the CSV file has a non-numeric `amount_eur` value
- **THEN** the import fails with an error that identifies the row, and does not silently skip that
  row or continue importing the remaining rows as if nothing happened

#### Scenario: Duplicate row_index aborts import with an error
- **WHEN** two rows in the CSV file share the same `row_index` value
- **THEN** the import fails with an error identifying both rows, since `row_index` uniqueness is
  required for it to serve as the identity key

### Requirement: Import from a user-picked file
The system SHALL allow the user to pick an arbitrary CSV file from their local disk, with columns
`row_index, date, category, amount_eur, note, is_daily, source_sheet`, and import it via the
upsert behavior above. A file picked this way is imported without a caller-supplied expected row
count or amount sum.

#### Scenario: User imports a corrected file to fix bad data
- **WHEN** the user has previously imported transactions and later notices incorrect amounts for a
  given month, produces a corrected CSV file (same `row_index` values, corrected `amount_eur`
  values), and picks that file via the file picker
- **THEN** the system imports the file, updating the existing transactions whose `row_index` values
  are present in the file, and reports how many were updated versus newly created

#### Scenario: Picked file with malformed rows fails loudly
- **WHEN** the user picks a CSV file from disk that contains a malformed row
- **THEN** the import fails with an error identifying the offending row, and no partial import is
  committed for that file

### Requirement: CSV export of all transactions
The system SHALL support exporting all transactions currently stored, in the same column shape as
the import format (`row_index, date, category, amount_eur, note, is_daily, source_sheet`), so data
can be taken out of the app independent of its internal storage, and so an exported file remains
re-importable without breaking idempotency.

#### Scenario: Export produces one row per transaction in import-compatible shape
- **WHEN** the user triggers export with N transactions stored across multiple categories
- **THEN** the exported CSV contains exactly N data rows plus a header row, with `row_index`
  (the original imported row's index, or a newly assigned unique index for transactions entered
  directly in the app), `date`, `category`, `amount_eur` (converted back from integer cents to a
  decimal EUR value), `note`, and `is_daily` populated from each transaction and its category,
  and `source_sheet` present as an empty column
</content>

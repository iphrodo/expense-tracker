# data-import Specification

## Purpose

Moves nine months of transaction history out of the source spreadsheet into the app exactly once,
and keeps an escape hatch back out to CSV so the user is never locked into this app's storage.

## Requirements

### Requirement: One-time CSV seed import
The system SHALL support importing transactions from a CSV file at `/seed/transactions.csv` with
columns `row_index, date, category, amount_eur, note, is_daily, source_sheet`. The system SHALL
create a `Category` record for each distinct `category` value encountered, setting that
category's `isDaily` flag from the `is_daily` column. The `source_sheet` column SHALL be read but
not stored or otherwise used, since it is migration provenance only. `row_index` SHALL be a
unique, stable integer per row in the source file — assigned once when the CSV is generated from
the spreadsheet — and SHALL NOT be derived from `date`, `category`, `amount_eur`, or `note`, since
those columns are not unique per row (a single spreadsheet cell batching several purchases, e.g.
`=5.96+4.22+4.96`, expands into multiple rows that legitimately share date, category, and amount).

#### Scenario: Import creates categories and transactions from CSV rows
- **WHEN** `/seed/transactions.csv` contains rows for 29 distinct category values across 1763
  data rows
- **THEN** the import creates 29 `Category` records (one per distinct value, `isDaily` set per
  row) and 1763 `Transaction` records, one per data row, with `amountEur` stored as integer cents
  converted from `amount_eur`

#### Scenario: Negative amount_eur values are imported as valid transactions
- **WHEN** a row in `/seed/transactions.csv` has a negative `amount_eur` value, such as a refund
  recorded against its original category (e.g. `-50.78`)
- **THEN** the import creates a `Transaction` with a negative `amountEur` in integer cents; a
  negative value is not treated as malformed and is not rejected or skipped

#### Scenario: Rows sharing date, category, and amount are all imported
- **WHEN** `/seed/transactions.csv` contains 3 rows with distinct `row_index` values that share
  the same `date`, `category`, and `amount_eur` (a batched-cell expansion)
- **THEN** the import creates 3 separate `Transaction` records, none of them dropped as a
  duplicate

### Requirement: Import is idempotent using row_index as the identity key
Running the import a second time against the same CSV file SHALL NOT create duplicate `Category`
or `Transaction` records. The system SHALL use each row's `row_index` — not any combination of
`date`, `category`, `amount_eur`, or `note` — as the identity key for detecting a row already
imported.

#### Scenario: Re-running import does not duplicate rows
- **WHEN** the import has already run once successfully for `/seed/transactions.csv`, and the
  user runs it again against the same file without modification
- **THEN** the count of `Transaction` and `Category` records after the second run equals the
  count after the first run, and every `row_index` from the file is still represented by exactly
  one `Transaction`

#### Scenario: Legitimate same-value rows survive a re-run
- **WHEN** the CSV contains multiple rows sharing `date`, `category`, and `amount_eur` (as in the
  batched-cell expansion scenario above), and the import is run twice
- **THEN** all of those rows are present after the second run exactly once each, keyed by their
  distinct `row_index` values, with none dropped and none duplicated

### Requirement: Import asserts expected row count and amount total
The import SHALL accept an expected row count and an expected sum of `amount_eur` supplied by the
caller. After processing the file, the import SHALL compare the number of data rows read and the
sum of their `amount_eur` values against these expected values, and SHALL fail loudly — reporting
the expected and actual values — if either does not match, rather than completing silently on a
truncated or partially-read file.

#### Scenario: Matching count and sum completes successfully
- **WHEN** the import is invoked with an expected row count of 1763 and an expected amount sum of
  36442.17 EUR, and both match what is actually read from `/seed/transactions.csv`
- **THEN** the import completes and reports success

#### Scenario: Row count mismatch fails loudly
- **WHEN** the import is invoked with an expected row count that does not match the number of
  data rows actually present in the file
- **THEN** the import fails with an error stating the expected and actual row counts, and does
  not silently proceed as if the import were complete

#### Scenario: Amount sum mismatch fails loudly
- **WHEN** the import is invoked with an expected `amount_eur` sum that does not match the sum of
  `amount_eur` actually read from the file
- **THEN** the import fails with an error stating the expected and actual sums, and does not
  silently proceed as if the import were complete

### Requirement: Import reports counts and fails loudly on malformed rows
On successful completion, the import SHALL report the number of categories created and
transactions imported. If any row is malformed (e.g. unparseable `date`, non-numeric
`amount_eur`, missing `category`, or missing/duplicate `row_index`), the import SHALL fail with
an error identifying the offending row rather than silently skipping it.

#### Scenario: Successful import reports counts
- **WHEN** the import completes with no malformed rows
- **THEN** the system reports the number of categories created and the number of transactions
  imported

#### Scenario: Malformed row aborts import with an error
- **WHEN** a row in `/seed/transactions.csv` has a non-numeric `amount_eur` value
- **THEN** the import fails with an error that identifies the row, and does not silently skip
  that row or continue importing the remaining rows as if nothing happened

#### Scenario: Duplicate row_index aborts import with an error
- **WHEN** two rows in `/seed/transactions.csv` share the same `row_index` value
- **THEN** the import fails with an error identifying both rows, since `row_index` uniqueness is
  required for it to serve as the idempotency key

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

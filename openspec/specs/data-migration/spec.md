# data-migration Specification

## Purpose

Moves data already accumulated in the app's local IndexedDB into the shared Postgres database
exactly once, with verification strong enough that nothing local is discarded on a guess.

## Requirements

### Requirement: Migration input must be a data-backup export, not the transaction CSV
The load script SHALL take the path to a `data-backup` JSON export file (see the `data-backup`
capability) as its input and SHALL NOT accept the per-transaction CSV export as a substitute. The
user SHALL produce this file, immediately before running the load script, using the running app's
"Export data (backup)" action — not an export taken before the `data-backup` feature existed.

#### Scenario: A CSV file is rejected as migration input
- **WHEN** the load script is pointed at the per-transaction CSV export instead of a `data-backup`
  JSON file
- **THEN** the load script fails to parse it as a valid backup and does not write anything to
  Postgres

#### Scenario: The re-export is a blocking manual step before migration
- **WHEN** the user is ready to run the migration
- **THEN** they first re-export using "Export data (backup)" on the machine holding the
  authoritative local data, and use that fresh file as the load script's input — an export taken
  before this feature existed (e.g. the old CSV) is not acceptable input

### Requirement: Load script computes and prints figures from the export before writing
Given the path to an export file, the load script SHALL compute the row count, the distinct
category count, and the sum of transaction amounts directly from that file, and SHALL print these
figures before writing anything to Postgres. The load SHALL happen inside a single database
transaction.

#### Scenario: Figures are printed before any write
- **WHEN** the load script is run against an export file
- **THEN** the row count, category count, and amount sum computed from the file are printed to the
  user before any row is written to Postgres

#### Scenario: Duplicate row index within the file aborts the load
- **WHEN** the export file contains two transactions sharing the same row index
- **THEN** the load script aborts before writing anything, since row index must be a uniqueness key
  within the file

### Requirement: Load verifies against Postgres and rolls back on mismatch
After writing, the load script SHALL re-read the row count, distinct category count, and sum of
transaction amounts from Postgres, SHALL compare each against the figure computed from the export
file (never against a hardcoded constant), and SHALL roll back the entire transaction if any
figure does not match. The load SHALL also verify that per-month transaction totals computed from
Postgres match per-month totals computed from the export file.

#### Scenario: Matching figures commit the load
- **WHEN** the row count, category count, amount sum, and every per-month total re-read from
  Postgres after the write match the figures computed from the export file
- **THEN** the transaction commits and the load reports success

#### Scenario: A mismatched total rolls back the whole load
- **WHEN** the amount sum re-read from Postgres after the write does not match the sum computed
  from the export file
- **THEN** the load script rolls back the transaction, leaves Postgres unchanged, and reports the
  mismatch with both figures

#### Scenario: A per-month mismatch is caught even when the grand total matches
- **WHEN** the grand total re-read from Postgres matches the export file's grand total, but one
  month's total does not match that month's total in the export file
- **THEN** the load script rolls back the transaction and reports which month's total did not match

### Requirement: Local data is retained until migration is verified
The system SHALL NOT remove the seed CSV file or any local IndexedDB data as part of the same
change that performs the load. Local data removal SHALL happen only after the load has committed,
its verification has passed, and the user has confirmed the app's displayed figures against
Postgres match what it displayed against local storage beforehand.

#### Scenario: Load completing does not delete local data
- **WHEN** the load script completes and reports success
- **THEN** the local IndexedDB data and the seed CSV file are both still present until a separate,
  later step removes them

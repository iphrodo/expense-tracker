# data-backup Specification

## Purpose

The existing per-transaction CSV export/import has no columns for `month_flags` or
`average_exclusions`, and no `isArchived`/`sortOrder` columns for categories. Anything relying on
that CSV as a full-fidelity export or migration input silently loses month flags, average
exclusions, and category archive/order state — the app keeps working and keeps showing plausible
numbers, just wrong ones, with nothing indicating the shift. This capability adds a full-fidelity
JSON export/import that closes that gap.

## Requirements

### Requirement: Full-fidelity backup export covers all four local tables
The system SHALL support exporting the complete contents of local storage — `categories` (`id`,
`name`, `isDaily`, `isArchived`, `sortOrder`), `transactions` (`id`, `date`, `categoryId`,
`amountCents`, `note`, `importRowIndex`), `monthFlags` (`month`, `isComplete`), and
`averageExclusions` (`categoryId`, `month`, `reason`) — as a single JSON file, distinct from the
existing per-transaction CSV export. The file SHALL include a `version` field (starting at `1`) and
an `exportedAt` ISO 8601 timestamp. `amountCents` SHALL be written as the integer already held in
storage, without round-tripping through a decimal string. `date` values SHALL be `YYYY-MM-DD`
strings; `month` values SHALL be normalised to the first of the month. Relations between tables
SHALL be carried by id (`categoryId`), not by category name.

#### Scenario: Export includes all four tables
- **WHEN** the user triggers "Export data (backup)" from the running app
- **THEN** the downloaded JSON file contains every category, transaction, month flag, and average
  exclusion currently stored locally, plus a `version` field and an `exportedAt` timestamp

#### Scenario: Amounts are exported as integers, not decimal strings
- **WHEN** the export includes two transactions whose `amountCents` values are 460 and 460 (one
  entered as "4.6", the other as "4.60" in the source data)
- **THEN** the JSON file's `amountCents` fields for both are the integer `460`, with no decimal
  formatting or reparsing step involved

#### Scenario: Month flags and average exclusions are present when they exist locally
- **WHEN** local storage has a month marked complete and one or more average exclusions recorded
- **THEN** the export's `monthFlags` and `averageExclusions` arrays are non-empty and contain those
  entries with their original `month`, `isComplete`, `categoryId`, and `reason` values

### Requirement: The full backup export and the transaction CSV export are kept distinct and both available
The system SHALL keep the existing per-transaction CSV export unchanged, for opening data in a
spreadsheet, and SHALL present both export actions in the UI with labels that make the difference
unambiguous ("Export data (backup)" for the full JSON export, "Export transactions (CSV)" for the
flat transaction-only export), so a user taking a backup cannot reach for the lossy one by mistake.

#### Scenario: Both exports are available and distinctly labeled
- **WHEN** the user opens the import/export screen
- **THEN** both "Export data (backup)" and "Export transactions (CSV)" controls are visible, and
  neither label could be mistaken for covering the same data as the other

### Requirement: Backup import validates before writing anything, then replaces all four tables atomically
Given a backup file, the system SHALL reject it before writing anything to local storage if: its
`version` is not one the app recognises; it contains two categories with the same `id`; it contains
two transactions with the same `importRowIndex`; it contains two `averageExclusions` entries with
the same `(categoryId, month)` pair; or any `transactions` or `averageExclusions` entry references
a `categoryId` not present in the file's `categories`. Each rejection SHALL surface a clear,
specific error message. If validation passes, the system SHALL replace the current contents of all
four local tables with the file's contents inside a single transaction, with no partial application
if the write fails partway through. On success, the system SHALL report the number of rows written
per table.

#### Scenario: An unrecognised version is rejected with a clear message
- **WHEN** the user picks a backup file whose `version` field is not a version this app supports
- **THEN** the import is rejected before any local data is touched, and the error names the
  unrecognised version

#### Scenario: Duplicate category ids are rejected
- **WHEN** the backup file contains two categories sharing the same `id`
- **THEN** the import is rejected before any local data is touched

#### Scenario: Duplicate importRowIndex values are rejected
- **WHEN** the backup file contains two transactions sharing the same `importRowIndex`
- **THEN** the import is rejected before any local data is touched

#### Scenario: A duplicate average-exclusion key is rejected
- **WHEN** the backup file contains two `averageExclusions` entries with the same `categoryId` and
  `month`
- **THEN** the import is rejected before any local data is touched

#### Scenario: A dangling categoryId reference is rejected
- **WHEN** a transaction or average exclusion in the backup file references a `categoryId` that
  does not appear in the file's `categories` array
- **THEN** the import is rejected before any local data is touched, and the error identifies the
  unknown `categoryId`

#### Scenario: A valid backup replaces all four tables and reports counts
- **WHEN** the user picks a valid backup file to import
- **THEN** the current contents of `categories`, `transactions`, `monthFlags`, and
  `averageExclusions` in local storage are replaced with the file's contents, and the system
  reports how many rows were written to each of the four tables

#### Scenario: A failure partway through the write leaves local storage unchanged
- **WHEN** the write to local storage fails after some but not all tables have been written
- **THEN** none of the four tables reflect a partial write — either all four are replaced or none
  are

### Requirement: A round-trip export then import reproduces the original data exactly
The system's export and import SHALL be exact inverses for a valid dataset: exporting a database's
contents and importing the resulting file into an empty database SHALL reproduce every category,
transaction, month flag, and average exclusion with identical field values, including
`amountCents`, `importRowIndex`, and exclusion `reason` text.

#### Scenario: Export then import into an empty database matches the original
- **WHEN** a database containing categories, transactions, month flags, and average exclusions is
  exported, and the resulting file is imported into an empty database
- **THEN** all four tables in the newly-populated database match the original database's contents
  exactly, field for field

## MODIFIED Requirements

### Requirement: Saving is optimistic with no confirmation or navigation
On save, the system SHALL update the UI (clear the entry form back to an empty entry state, per
the focus requirement above) without waiting for the write to storage to complete, and SHALL show a
toast with an Undo action for a few seconds. The system SHALL NOT show a confirmation dialog or a
separate success screen, and SHALL NOT navigate away from the Month view. If the saved
transaction's date falls within the currently-viewed month, it SHALL appear in the transaction
list below the entry form without requiring a reload. If the write to storage subsequently fails,
the system SHALL restore the entry into the entry form (as if it had not been saved) and SHALL show
a non-blocking error, rather than silently discarding the entry.

#### Scenario: Form clears immediately without waiting on storage
- **WHEN** the user saves
- **THEN** the entry form returns to its empty initial state and a toast with an Undo action
  appears within the same UI frame, before the write to storage is confirmed

#### Scenario: Undo reverses the save
- **WHEN** the user activates Undo within the toast's visible duration
- **THEN** the transaction(s) created by that save are deleted and do not appear in any
  analytics view

#### Scenario: No blocking confirmation on save
- **WHEN** the user saves
- **THEN** no confirmation dialog is shown and the view stays on the Month view

#### Scenario: A new transaction for the viewed month appears without reload
- **WHEN** the user saves a transaction dated within the month currently selected in the Month
  view
- **THEN** the transaction appears in the category-grouped list below the entry form, and the
  sidebar's totals update, without a page reload

#### Scenario: A failed save restores the entry instead of losing it
- **WHEN** the user saves and the write to storage fails (e.g. a network error)
- **THEN** the entry's amount, category, date, and note are restored into the entry form, a
  non-blocking error is shown, and the entry does not silently disappear

#### Scenario: A batch of saves where one entry fails mid-batch
- **WHEN** the user saves several entries in quick succession using keyboard-only batch entry, and
  one of the underlying writes fails while the others succeed
- **THEN** the successfully-written entries remain saved, the failed entry is restored into the
  entry form with a non-blocking error, and the user is not required to re-enter the entries that
  already succeeded

### Requirement: Transactions can be edited after saving
Selecting any transaction from the month view SHALL open it for editing. Amount, category, date,
and note SHALL all be editable. The amount field in edit mode SHALL use the same expression
parser as entry. If an edited expression would evaluate to more than one top-level term (i.e. it
contains a top-level `+` or `-` split), the system SHALL reject it inline as invalid for an edit
and SHALL NOT split one existing transaction into several — editing a single transaction always
produces a single transaction. Saving an edit SHALL persist the change without a confirmation
dialog. If the write to storage fails, the edit SHALL remain open with the user's changes intact
and the system SHALL show a non-blocking error, rather than silently discarding the edit or
reverting it without explanation.

#### Scenario: Editing amount, category, date, and note
- **WHEN** the user opens a transaction from the month view and changes its amount, category,
  date, and note, then saves the edit
- **THEN** the transaction is updated in place with the new amount, category, date, and note, and
  no new transaction is created

#### Scenario: Multi-addend expression is rejected when editing
- **WHEN** the user opens an existing transaction for editing and types `5.96+4.22` into the
  amount field
- **THEN** the system shows an inline validation message and does not allow save, since editing
  one transaction cannot split it into several

#### Scenario: Editing an imported transaction preserves its import identity
- **WHEN** the user edits a transaction that was created by the CSV import (and so carries an
  `importRowIndex`)
- **THEN** after the edit is saved, the transaction still carries the same `importRowIndex`, so a
  future idempotency check or CSV export still associates it with its original source row

#### Scenario: A failed edit keeps the changes visible instead of losing them
- **WHEN** the user saves an edit and the write to storage fails
- **THEN** the edit view remains open with the user's changes still in the fields, and a
  non-blocking error is shown

### Requirement: Transactions can be deleted with Undo
A transaction SHALL be deletable from its edit view. Deleting SHALL show an Undo affordance
consistent with the entry screen's save-Undo toast (a toast with an Undo action visible for a few
seconds). If the write to storage fails, the system SHALL show a non-blocking error and SHALL leave
the transaction visible as if the delete had not happened, rather than removing it from the UI
ahead of a storage failure.

#### Scenario: Delete removes the transaction
- **WHEN** the user deletes a transaction and lets the Undo toast expire without activating Undo
- **THEN** the transaction no longer exists and does not appear in the month view or any analytics
  view

#### Scenario: Undo reverses a delete
- **WHEN** the user activates Undo within the toast's visible duration after deleting a
  transaction
- **THEN** the transaction is restored with its original amount, category, date, note, and (if
  present) `importRowIndex`

#### Scenario: A failed delete leaves the transaction visible
- **WHEN** the user deletes a transaction and the write to storage fails
- **THEN** the transaction remains visible in the month view, a non-blocking error is shown, and no
  Undo toast is left implying a delete that did not actually happen

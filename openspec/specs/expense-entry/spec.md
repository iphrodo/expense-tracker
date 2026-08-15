# expense-entry Specification

## Purpose

Lets a user batch-enter a day's expenses quickly at a keyboard, evening-review style, and correct
a mistyped entry afterward — the entry screen is the app's home screen, and editing/deleting a
transaction is a first-class path, not a dead end past the Undo toast.

## Requirements

### Requirement: Entry screen is the app home
The application SHALL open directly on the Month view on launch, regardless of device, with the
expense entry form rendered at the top of the Month view's main content column, above the
category-grouped transaction list. The app SHALL NOT show any other screen before the Month view.
There SHALL NOT be a separate, independently-navigable Entry screen or bottom-navigation tab.

#### Scenario: Cold launch lands on entry
- **WHEN** the user opens the installed app (or loads the app in a browser) with no prior
  in-app navigation
- **THEN** the Month view is the first and only screen rendered, and the expense entry form is
  visible at the top of its main content column without further navigation

#### Scenario: No standalone Entry screen is reachable
- **WHEN** the user looks at the app's navigation
- **THEN** there is no separate "Entry" screen or nav item distinct from the Month view — entry
  and month review are the same screen

### Requirement: Amount field is focused on mount and after every save
The amount input, embedded at the top of the Month view, SHALL receive focus automatically when
the Month view mounts, and SHALL receive focus again immediately after each successful save, so
the user never reaches for the mouse or trackpad to begin the next entry. The field SHALL use a
standard text keyboard on mobile, not a numeric-only one, so the arithmetic operators (`+ - * /
( )`) remain typeable. Switching the selected month (e.g. via the month/year pickers) SHALL NOT
itself move focus into or out of the amount field.

#### Scenario: No interaction needed to start typing on mount
- **WHEN** the Month view finishes mounting
- **THEN** the amount input has focus without any user interaction

#### Scenario: Focus returns to amount after save
- **WHEN** a save completes
- **THEN** the amount input has focus again, with an empty value, before the user performs any
  further action

### Requirement: Amount field accepts arithmetic expressions with explicit splitting rules
The amount field SHALL accept an arithmetic expression using digits, a decimal separator, and the
operators `+ - * / ( )`. Both `.` and `,` SHALL be accepted as the decimal separator; any `,` in
the input SHALL be normalized to `.` before validation and evaluation, so `12,50` and `12.50` are
equivalent. Splitting into transactions follows these rules:

- **Top-level `+` and `-` split the expression into separate transactions**, one per top-level
  term, each carrying its own sign. `17.03-10.50` SHALL create two transactions: one of amount
  1703 cents and one of amount -1050 cents.
- **A leading unary `-` on the first top-level term negates that term's value** without itself
  counting as a split; `-50.78` alone SHALL create exactly one transaction of amount -5078 cents.
- **`*`, `/`, and anything inside parentheses evaluate within a single term** and do not
  themselves split; `(3+4)*2` and `500/50.85` SHALL each create exactly one transaction.
- The final amount of every resulting transaction MAY be negative. It SHALL NOT be zero: an
  expression, or any individual top-level term within it, that evaluates to exactly 0 SHALL be
  rejected inline as a whole (no partial save of the non-zero terms).
- Input containing any character outside `0-9 . , + - * / ( )` SHALL be rejected with inline
  validation; the system SHALL NOT show a modal dialog for a rejected expression.

#### Scenario: Batch entry splits addends into separate transactions
- **WHEN** the user types `5.96+4.22+4.96` and selects a category, then saves
- **THEN** the system creates exactly 3 transactions, each in the selected category and dated
  today, with amounts 596, 422, and 496 (integer cents)

#### Scenario: Single amount creates one transaction
- **WHEN** the user types `12.50` and selects a category, then saves
- **THEN** the system creates exactly 1 transaction of amount 1250 cents

#### Scenario: Comma decimal separator is accepted
- **WHEN** the user types `12,50` and selects a category, then saves
- **THEN** the system creates exactly 1 transaction of amount 1250 cents, identical to typing
  `12.50`

#### Scenario: Top-level minus creates a negative transaction
- **WHEN** the user types `17.03-10.50` and selects a category, then saves
- **THEN** the system creates exactly 2 transactions: one of amount 1703 cents and one of amount
  -1050 cents

#### Scenario: Leading unary minus creates a single negative transaction
- **WHEN** the user types `-50.78` and selects a category, then saves
- **THEN** the system creates exactly 1 transaction of amount -5078 cents

#### Scenario: Multiplication and division stay within a single transaction
- **WHEN** the user types `9.83*2` and selects a category, then saves
- **THEN** the system creates exactly 1 transaction of amount 1966 cents
- **WHEN** the user instead types `500/50.85` and selects a category, then saves
- **THEN** the system creates exactly 1 transaction of amount 983 cents (500 / 50.85, rounded to
  the nearest cent)

#### Scenario: Parenthesized sub-expression combined with top-level operators
- **WHEN** the user types `9.99+62.3+(4.8+4.8+7.13)*0.9` and selects a category, then saves
- **THEN** the system creates exactly 3 transactions — one per top-level `+`-separated term — with
  the third term's amount computed by first evaluating `(4.8+4.8+7.13)*0.9` as a single value

#### Scenario: A zero-valued term is rejected inline
- **WHEN** the user types `5+0+3` or types `0` alone
- **THEN** the system shows an inline validation message and does not allow save, and no modal
  dialog is displayed

#### Scenario: Invalid character is rejected inline
- **WHEN** the user types `12.50; DROP TABLE` into the amount field
- **THEN** the system shows an inline validation message and does not allow save, and no modal
  dialog is displayed

### Requirement: Category selection supports keyboard type-ahead and mouse chips
The entry screen SHALL present categories as chips that are visible without opening a dropdown or
other overlay, ordered by a recency-weighted frequency score, most-likely-next first — this
remains a mouse/pointer affordance. Independently, `Tab` from the amount field SHALL move focus to
a category field that supports keyboard-only selection: typing a prefix filters the category list,
and arrow keys or continued typing select a match, without requiring a dropdown to be opened with
a pointer. The keyboard path SHALL be sufficient on its own — a user SHALL be able to select any
category using only the keyboard.

#### Scenario: Usual categories fit above the fold on desktop
- **WHEN** the entry screen is rendered on a desktop-sized viewport with the user's category
  history available
- **THEN** the user's 8 most recently-and-frequently used categories are rendered as chips
  without requiring the user to scroll

#### Scenario: Full category list requires an extra tap on the chip path
- **WHEN** the desired category is not among the visible chips
- **THEN** the user must tap "more" to reveal a search field before finding it via the mouse path

#### Scenario: Category is selectable by keyboard alone
- **WHEN** the user presses `Tab` from the amount field, types a prefix that matches a category
  name, and confirms the match with the keyboard (arrow key plus `Enter`, or continued typing to
  an unambiguous match)
- **THEN** that category is selected without the user touching a mouse or trackpad at any point

### Requirement: Uninterrupted keyboard-only batch entry
`Enter` SHALL save the current transaction and return focus to an empty amount field, ready for
the next entry. Logging multiple transactions in a row SHALL require no mouse or trackpad
interaction at any point, from the first amount keystroke through the last save.

#### Scenario: Three transactions logged with only the keyboard
- **WHEN** the user, using only the keyboard, types an amount, presses `Tab`, types a category
  prefix and confirms it, presses `Enter` to save, and repeats this sequence two more times
  without touching a mouse or trackpad
- **THEN** three transactions are created, and after each `Enter` the amount field is empty and
  focused again before the next amount is typed

### Requirement: Date persists across saves within a session
The date field SHALL default to today's date on a fresh app load. Once set (by the user, or left
at its default), the date SHALL persist unchanged across successive saves within the same app
session, rather than resetting to today after each save, since a batch of entries is usually all
one date. A single visible control SHALL still step the date to yesterday in one action.
Selecting any other date SHALL require opening a date picker. A fresh app load SHALL reset the
date to today regardless of what was last used in a prior session.

#### Scenario: Default date is today on a fresh load
- **WHEN** the entry screen mounts after a fresh app load
- **THEN** the date field shows today's date without any user interaction

#### Scenario: Date persists across saves in the same session
- **WHEN** the user steps the date to yesterday and saves three transactions in sequence without
  reloading the app
- **THEN** all three transactions are dated yesterday, and the date field still shows yesterday
  after each save

#### Scenario: Yesterday is one action away
- **WHEN** the user activates the "yesterday" control
- **THEN** the date field updates to yesterday's date in a single action, without opening a picker

#### Scenario: Fresh load resets to today
- **WHEN** the user reloads or relaunches the app after having changed the date in a prior session
- **THEN** the date field shows today's date, not the date left over from the prior session

### Requirement: Note is optional and collapsed by default
The entry screen SHALL include a note field that is collapsed (not visible as an open input) by
default and is never required to save a transaction.

#### Scenario: Save succeeds with no note
- **WHEN** the user enters an amount, selects a category, and saves without expanding or filling
  the note field
- **THEN** the transaction is saved with an empty note

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

### Requirement: Category chips and search results are rendered with the category's display color
The quick-access category chips SHALL be rendered with each category's deterministic display
color (the same color mapping used elsewhere in the system for that category), rather than as
plain uncolored outlined pills. The category search results — both the keyboard type-ahead matches
and the "more" search dropdown matches — SHALL also render each matched category with that same
color. The selected/highlighted state of a chip or match SHALL remain visually distinguishable from
its unselected state while still conveying the category's color.

#### Scenario: Quick-access chips show category colors
- **WHEN** the entry form renders its quick-access category chips
- **THEN** each chip is styled with its category's deterministic display color, not a plain
  uncolored outline

#### Scenario: Type-ahead matches show category colors
- **WHEN** the user types a prefix into the keyboard category field and matching categories appear
- **THEN** each matched category in the list is rendered with its deterministic display color

#### Scenario: "More" search dropdown matches show category colors
- **WHEN** the user opens the "more" search field and types a query that matches existing
  categories
- **THEN** each matched category in the dropdown is rendered with its deterministic display color

#### Scenario: Selected chip remains distinguishable from unselected chips
- **WHEN** a category chip is selected
- **THEN** the selected chip is visually distinguishable from unselected chips (e.g. via a border,
  weight, or highlight change) while still showing its category color
</content>

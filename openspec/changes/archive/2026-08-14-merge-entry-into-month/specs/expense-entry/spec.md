## MODIFIED Requirements

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
the user never reaches for the mouse or trackpad to begin the next entry. On devices that present
a numeric keyboard, mounting or refocusing the amount field SHALL present it. Switching the
selected month (e.g. via the month/year pickers) SHALL NOT itself move focus into or out of the
amount field.

#### Scenario: No interaction needed to start typing on mount
- **WHEN** the Month view finishes mounting
- **THEN** the amount input has focus without any user interaction

#### Scenario: Focus returns to amount after save
- **WHEN** a save completes
- **THEN** the amount input has focus again, with an empty value, before the user performs any
  further action

### Requirement: Saving is optimistic with no confirmation or navigation
On save, the system SHALL update the UI (clear the entry form back to an empty entry state, per
the focus requirement above) without waiting for the IndexedDB write to complete, and SHALL show a
toast with an Undo action for a few seconds. The system SHALL NOT show a confirmation dialog or a
separate success screen, and SHALL NOT navigate away from the Month view. If the saved
transaction's date falls within the currently-viewed month, it SHALL appear in the transaction
list below the entry form without requiring a reload.

#### Scenario: Form clears immediately without waiting on storage
- **WHEN** the user saves
- **THEN** the entry form returns to its empty initial state and a toast with an Undo action
  appears within the same UI frame, before the IndexedDB write is confirmed

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

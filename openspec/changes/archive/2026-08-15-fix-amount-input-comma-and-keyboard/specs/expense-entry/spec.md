## MODIFIED Requirements

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

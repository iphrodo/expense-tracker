## Why

The amount field's spec mandates a numeric keyboard on mobile and only documents `.` as the
decimal separator. In practice this breaks entry for users on locales where the numeric/decimal
keyboard's decimal key inserts a comma (rejected by the parser) and prevents typing the
arithmetic operators (`+ - * / ( )`) the field is supposed to support, since numeric keypads don't
expose them. Both issues are already fixed in code (comma is normalized to a period before
parsing; the input now uses a standard text keyboard instead of a numeric one) but the spec still
describes the old, now-incorrect behavior.

## What Changes

- The amount field SHALL accept `,` as an alternative decimal separator, normalized to `.` before
  parsing/validation.
- The amount field SHALL NOT require or force a numeric-only keyboard; on mobile it presents a
  standard text keyboard so operator characters remain typeable. The prior requirement text
  mandating a numeric keyboard is removed.
- No change to arithmetic/splitting semantics, cents rounding, or validation error behavior beyond
  accepting the comma variant.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `expense-entry`: "Amount field is focused on mount and after every save" no longer requires a
  numeric keyboard to be presented. "Amount field accepts arithmetic expressions with explicit
  splitting rules" now documents `,` as an accepted, normalized decimal separator.

## Impact

- `src/lib/expressionParser.ts` — comma-to-period normalization (already implemented).
- `src/features/entry/ExpenseEntryForm.tsx`, `src/features/entry/EditTransactionPanel.tsx` —
  `inputMode` changed from `"decimal"` to `"text"` (already implemented).
- `openspec/specs/expense-entry/spec.md` — brought in sync with the above.

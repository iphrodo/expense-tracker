## 1. Amount parsing

- [x] 1.1 Normalize `,` to `.` in the amount input before validation/parsing in
      `src/lib/expressionParser.ts`
- [x] 1.2 Confirm `fractionFromDecimalString` in `src/lib/money.ts` needs no change (it only sees
      already-normalized `.`-separated literals)

## 2. Mobile keyboard

- [x] 2.1 Change `inputMode` from `"decimal"` to `"text"` on the amount input in
      `src/features/entry/ExpenseEntryForm.tsx`
- [x] 2.2 Change `inputMode` from `"decimal"` to `"text"` on the amount input in
      `src/features/entry/EditTransactionPanel.tsx`

## 3. Verification

- [x] 3.1 `tsc --noEmit` passes
- [ ] 3.2 Manually verify on a mobile browser that the text keyboard shows operator characters and
      that a comma-separated amount (e.g. `12,50`) saves correctly

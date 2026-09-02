## 1. Category-history data

- [x] 1.1 Add a pure helper that groups one category's transactions by active calendar month across
      all years, returning signed totals, matching transactions, and bar magnitudes
- [x] 1.2 Sort each month's transactions by date descending with a stable id tie-breaker
- [x] 1.3 Add Vitest coverage for negative/refund totals, zero-net active months, category
      filtering, cross-year grouping, and transaction ordering

## 2. Category history screen

- [x] 2.1 Add `CategoryHistoryView` with an explicit searchable category selector
- [x] 2.2 Include active categories plus archived categories that have transactions; sort them
      alphabetically and show their existing deterministic color identity
- [x] 2.3 Render active localized month rows with their years, signed totals, proportional bars,
      and a full-history category total that remain legible on mobile
- [x] 2.4 Implement single-month inline expansion and collapse for matching transactions
- [x] 2.5 Open the existing `EditTransactionPanel` when a transaction row is selected
- [x] 2.6 Reset drill-down state safely when the category changes or reactive data removes the
      selected item
- [x] 2.7 Add clear initial and empty states for no category selection and no available history

## 3. Navigation

- [x] 3.1 Add `history` to the app's screen type and add History to the full desktop navigation
- [x] 3.2 Render `CategoryHistoryView` for the new destination without changing the default Month
      screen
- [x] 3.3 Replace the mobile text-only screen list with four icon-and-label items: `Місяць`,
      `Історія`, `Середні`, and `Ще`, preserving at least 44 × 44 px tap targets
- [x] 3.4 Add an accessible `Ще` bottom sheet or popover containing `Категорії`,
      `Імпорт / експорт`, and `Вийти`, with backdrop, Escape, selection, and navigation-triggered
      dismissal
- [x] 3.5 Treat `Ще` as active while Categories or Import / Export is open; mark active primary
      destinations with `aria-current="page"`
- [x] 3.6 Keep all destinations and the existing standalone Sign out action directly visible in
      desktop navigation

## 4. Verification

- [x] 4.1 Run the existing Vitest suite and fix regressions
- [x] 4.2 Run TypeScript type-checking, linting, and the production build
- [ ] 4.3 Ask the user to manually verify mobile scanability and transaction editing in the new
      category-first flow
- [ ] 4.4 Ask the user to manually verify the mobile bottom bar and `Ще` menu at a narrow viewport,
      including safe-area spacing and keyboard/focus dismissal

## 1. Design tokens

- [x] 1.1 Add the neutral, accent, spacing/radius/elevation, and type-scale tokens from
      `DESIGN_PROMPT.md` as CSS custom properties inside a Tailwind v4 `@theme` block in
      `src/index.css`.
- [x] 1.2 Wire `--t-*` type-scale tokens and `--s*`/`--r-*`/`--shadow-*` tokens into Tailwind
      utility generation (font size/weight/line-height/letter-spacing pairs, spacing scale,
      radius scale, shadow scale) so components consume them via utility classes, not inline
      styles.
- [x] 1.3 Confirm the app still builds and every existing screen still renders (no visual pass yet)
      after the token block lands, before touching component markup.

## 2. Category color roles

- [x] 2.1 Implement a single `dot`/`tint`/`text` role-derivation function fed by each category's
      existing deterministic hue assignment, satisfying the palette-ordering (adjacent hues
      visually distinct) and AA-contrast (`text` on `tint`) requirements.
- [x] 2.2 Add unit tests for the role function: same category → same three roles across calls;
      fixed hue → fixed roles; `text`/`tint` pair meets AA contrast; adjacent palette indices
      produce visually distinct `dot` hues.
- [x] 2.3 Replace every existing per-surface color computation (entry chips, search results, main
      list rows, breakdown rows) with calls into this single function.

## 3. Amount input and number formatting

- [x] 3.1 Restyle the amount input per `DESIGN_PROMPT.md` (full width, 64px mobile / 56px desktop,
      `--r-md`, `--surface`, `--border-strong`, `--t-display` value, `€` prefix, right-aligned
      `= result` hint, `--accent` focus border) without changing the expression-parsing or
      splitting logic.
- [x] 3.2 Replace `font-mono` on amount displays in `MonthView.tsx` and `AveragesView.tsx` (and any
      other amount displays) with the body font family plus `font-variant-numeric: tabular-nums`.

## 4. Entry form (chips, category search, date, note, save)

- [x] 4.1 Restyle quick-access category chips to `tint` background / `text` foreground / no
      border, with the selected state shown as a `dot`-color ring, per the `expense-entry` delta
      spec.
- [x] 4.2 Apply the same `tint`/`text` styling to keyboard type-ahead matches and "more" search
      dropdown results; keep the dashed-border ghost "more…" chip.
- [x] 4.3 Restyle the searchable category input (`--r-sm`, 44px height, placeholder text unchanged)
      and its dropdown (`--shadow-2`, dot + name rows, keyboard navigable) without changing
      keyboard navigation behavior.
- [x] 4.4 Replace the `Yesterday` / date field / `Today` control with the `Today | Yesterday |
      Pick…` segmented control plus a resolved-date caption beneath it, preserving the existing
      "one action to yesterday" and "fresh load resets to today" behavior exactly.
- [x] 4.5 Restyle the note toggle and its expanded single-line input; keep it collapsed by default.
- [x] 4.6 Restyle the Save button (primary, full-width on mobile) and wrap the whole entry form in
      one card per the mobile layout requirement, without changing save/optimistic-update timing.

## 5. Month list and day-group headers

- [x] 5.1 Replace each row's full-width category-color background with a neutral row background
      plus an 8px `dot` marker beside the category name, per the `expense-analytics` delta spec.
- [x] 5.2 Add each date group's own total to its sticky header, computed client-side from the
      group's already-fetched transactions.
- [x] 5.3 Restyle row height/padding/separators, the swipe/hover delete affordance, and day-group
      card wrapping (rounded card, hairline row separators, no per-row rounding) per
      `DESIGN_PROMPT.md`.
- [x] 5.4 Replace the native month/year `<select>` pair with a single button opening a popover
      month-grid, preserving the current month-selection behavior and keyboard reachability.
- [x] 5.5 Restyle the "Marked incomplete" state as a toggle chip and the month total display
      (`--t-micro` label over `--t-num-lg` figure) in the filter row.

## 6. Sidebar cards: Overview, Detail, Category breakdown

- [x] 6.1 Restyle the summary ("Overview"/"Всього") card into the stacked hierarchy: big total,
      Daily/Non-daily stacked bar + legend, and the two side-by-side stat blocks — keeping all five
      existing figures.
- [x] 6.2 Restyle the Detail ("Детально") card's definition-list rows and its `Разом` total row per
      the token type scale.
- [x] 6.3 Restyle the Category breakdown ("По категоріях") card: dot + name + right-aligned amount
      rows, each with a `dot`-colored proportional bar on its bottom edge.
- [x] 6.4 Implement the default descending-by-amount sort within each section plus the `A–Z` toggle
      per the `expense-analytics` delta spec, with the toggle resetting to the default on next
      load (no persistence).
- [x] 6.5 Move the per-category exclude/include affordance to a hover/tap icon button at the row
      end, keeping its existing confirmation-dialog behavior unchanged.

## 7. Averages screen

- [x] 7.1 Restyle the daily run-rate card (`--t-display` figure, `€/day`, elapsed-days and
      projection lines) reusing the Overview row-3 stat-block treatment.
- [x] 7.2 Restyle the category-averages table: no vertical rules, uppercase `--t-micro` column
      headers, 44px rows, dot + plain-text name column (no pill), right-aligned average and months
      count, sticky header on scroll.
- [x] 7.3 On mobile, drop the "Months counted" column into a `--t-meta` sub-line under the category
      name.
- [x] 7.4 Restyle "Active exclusions": `tint` pill (category) + month + quiet "Remove" button,
      keeping existing remove behavior.

## 8. Categories screen

- [x] 8.1 Restyle each category row (52px height: tappable color dot, name, daily/non-daily
      classification) and group rows under daily/non-daily `--t-micro` headers, keeping existing
      add/rename/delete behavior and keyboard reachability unchanged.

## 9. Import/Export screen

- [x] 9.1 Restyle into two cards (export, import) with `--t-h2` titles, one `--t-meta` explanation
      line each, and primary/secondary buttons, keeping existing formats and messages.
- [x] 9.2 Restyle status/error text (`--t-meta`, error text in the red-on-red-tint block) without
      changing what triggers an error or its message content.

## 10. Layout shells

- [x] 10.1 Build the mobile bottom tab bar (4 tabs, safe-area inset, active/inactive states,
      ≥44px targets) and confirm the entry form stays inline at the top of the expenses screen (no
      floating button, no sheet).
- [x] 10.2 Build the desktop top bar (app name, segmented tabs, quiet sign-out) and the two-column
      layout (flex 1.4 main column, fixed 360px sticky sidebar) replacing the current desktop
      chrome.
- [x] 10.3 Verify both shells share the same component implementations and only the shell markup
      differs (per `DESIGN_PROMPT.md`'s "same components and tokens; only the shell differs").

## 11. Micro-interactions and empty/loading states

- [x] 11.1 Add the specified hover/press and sheet/popover transition timings, respecting
      `prefers-reduced-motion: reduce`.
- [x] 11.2 Add the save animation (form clears in place, new row fade+rise, total count-up) without
      changing the underlying optimistic-save/Undo-toast behavior already specified in
      `expense-entry`.
- [x] 11.3 Add centered, single-line empty states (plus a secondary action button where applicable)
      and skeleton-row loading states, removing any spinner-in-list loading treatment.

## 12. Verification and cleanup

- [x] 12.1 Run the existing test suite and confirm no calculation, storage, or import/export test
      changes are needed.
- [x] 12.2 Manually walk every `expense-entry` keyboard-only scenario (batch entry, edit, delete,
      Undo) end to end after the restyle to confirm focus order and behavior are unchanged.
- [x] 12.3 Spot-check every screen against `Screens.dc.html` for token/spacing/color fidelity on
      both a mobile and a desktop viewport.
- [x] 12.4 Confirm every existing label is byte-identical to before the redesign (no copy drift).
- [x] 12.5 Remove or archive `DESIGN_PROMPT.md` and `Screens.dc.html` from the repo root once the
      redesign has landed.

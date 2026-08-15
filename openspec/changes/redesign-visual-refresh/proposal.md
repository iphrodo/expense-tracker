## Why

The app currently reads as a spreadsheet: full-width colored row fills, monospace numerals, native
`<select>` controls, and undifferentiated sections. `DESIGN_PROMPT.md` (design brief) and
`Screens.dc.html` (canvas mockup), both added to the repo root, define a token-based visual
language — neutral surfaces, a single green accent, dot+tint category identity, tabular-figure
numerals, and a mobile bottom-tab / desktop top-bar-plus-two-column shell — to replace it. This is
a restyle only: no calculation, storage, import/export, or feature-set change.

## What Changes

- Introduce a design-token system (color, type scale, spacing/radius/elevation) as the single
  source of truth for styling, replacing ad-hoc inline values.
- Replace full-width category-colored row fills everywhere (main transaction list, breakdown rows)
  with an 8px dot marker plus the category label; the row background becomes neutral.
- Derive three roles per category color (`dot`, `tint`, `text`) from the existing deterministic
  hue assignment, and use them consistently for chips, pills, dots, and proportional bars — same
  category, same hue as today, just applied differently.
- Replace monospace numerals with the same sans family at `font-variant-numeric: tabular-nums`
  everywhere an amount is shown.
- Restyle the amount input, category chips, searchable category field, date segmented control,
  note field, buttons, cards, and all screens (Month, Averages, Categories, Import/Export) per the
  component specs in `DESIGN_PROMPT.md`.
- Replace native `<select>`-driven month/year pickers with a popover month-grid button.
- Add a per-day total to each day-group header in the month view's transaction list — new
  information surfaced from data the app already computes, no new calculation.
- Change the category-breakdown and category-averages default sort from alphabetical to
  descending-by-amount within each section, with an `A–Z` toggle to recover the old order.
- Replace the mobile bottom-tab bar and desktop layout shell styling; add a desktop top bar
  (app name, segmented tabs, sign-out) replacing the current desktop chrome, per the mockup.
- No change to any label, copy, language mix, calculation, data model, storage format, or
  import/export behavior. Every control that exists today keeps its exact function.

## Capabilities

### New Capabilities
- `design-system`: Defines the shared design tokens (color, type, spacing/radius/elevation) and
  cross-cutting presentation rules (category color role derivation, tabular numerals, focus
  styling, minimum control sizing) that every screen's components draw from.

### Modified Capabilities
- `expense-analytics`: Main transaction list rows switch from a full-row category color tint to a
  dot+label identity; category rows in the "По категоріях" breakdown and elsewhere switch from a
  single deterministic color to the derived `dot`/`tint`/`text` roles; day-group headers gain a
  per-day total; category-breakdown and category-averages default sort changes from alphabetical
  to descending-by-amount with an `A–Z` toggle.
- `expense-entry`: Quick-access category chips and search-result rows switch from a single
  deterministic display color to the `tint` background / `text` foreground / no-border pill style,
  with the selected state shown as a `dot`-color ring instead of an arbitrary border/weight change.

## Impact

- Affected UI code: entry form, month view (list, day headers, sidebar cards), averages screen,
  categories screen, import/export screen, mobile tab bar, desktop top bar — i.e. the full frontend
  component/styling layer.
- No affected APIs, calculations, storage schema, or import/export formats.
- `DESIGN_PROMPT.md` and `Screens.dc.html` at the repo root are the source design artifacts for
  this change; they should be removed or archived once the redesign lands.

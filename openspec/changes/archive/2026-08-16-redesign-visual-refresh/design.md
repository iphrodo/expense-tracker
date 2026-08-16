## Context

Stack: React 19 + Vite + Tailwind CSS v4 (`@import 'tailwindcss'` in `src/index.css`, no
`tailwind.config.js` — v4 uses CSS-first `@theme`). Feature code lives under `src/features/`
(`entry`, `analytics`, `categories`, `import`, `auth`). `src/features/analytics/MonthView.tsx` and
`AveragesView.tsx` currently use `font-mono` for amounts and per-category colors are computed
inline. Two artifacts define the target design and live at the repo root: `DESIGN_PROMPT.md` (full
token/component spec) and `Screens.dc.html` (canvas mockup rendering the target screens with
literal hex/px values). Both should be treated as the source of truth for exact values; the specs
in this change capture only the externally observable behavior that changed. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Land the full token system, component restyle, and layout shell described in `DESIGN_PROMPT.md`
  without altering any calculation, storage write, or import/export behavior.
- Make category color a single computed source (hue → `dot`/`tint`/`text`) consumed everywhere,
  replacing today's ad-hoc per-surface color usage.
- Keep every existing keyboard path, focus behavior, and optimistic-save behavior in
  `expense-entry` byte-for-byte identical — only their visual presentation changes.

**Non-Goals:**
- No dark mode work beyond leaving room for it in the token structure, since the app does not
  currently support it (per `DESIGN_PROMPT.md`, dark mode is added only if the app already
  supports it).
- No changes to the CSV import/export format, Supabase schema, or RLS policies.
- No new screens, tabs, or navigation destinations beyond the existing four (Month, Averages,
  Categories, Import/Export).

## Decisions

**Tokens as Tailwind v4 `@theme` CSS variables, not a JS config.** Define the palette, type scale,
and spacing scale from `DESIGN_PROMPT.md` as CSS custom properties inside `@theme` in
`src/index.css`, so every utility class (`bg-surface`, `text-text-2`, `rounded-r-lg`, etc.) is
generated from the same source Tailwind already uses. Alternative considered: a shared TS constants
object imported into inline styles — rejected because it would fight Tailwind's utility model and
reintroduce the kind of ad-hoc per-component styling this change removes.

**Category color roles computed once from the existing hue, not restyled per surface.** Introduce
a single `getCategoryColorRoles(category) -> { dot, tint, text }` helper (or equivalent) fed by the
existing deterministic hue assignment, and have every consumer (main list dot, breakdown row,
entry chips, search results) call it, rather than each surface deriving its own tint/border
treatment. This satisfies the "same category, same hue, same three roles everywhere" requirement
in the `expense-analytics` and `expense-entry` deltas by construction — there is only one place the
mapping can drift.

**Day-group total is a client-side reduction over the group's already-fetched transactions**, not a
new query or stored value — the month view already has every transaction for the group in memory to
render the rows.

**Sort-order toggle for the breakdown/averages sections is local UI state, not persisted.** The
`DESIGN_PROMPT.md` brief explicitly calls for "ask nothing, just default to descending and offer
A–Z" — so the toggle resets to the descending default on next load rather than remembering the
user's last choice, matching the new `expense-analytics` requirement.

**Native `<select>` replaced with a popover month-grid component**, built as a plain positioned
panel (no new dependency), consistent with the existing pattern used for the "more" category search
dropdown.

## Risks / Trade-offs

- [Broad visual surface area touched at once (every screen) risks regressions in date logic,
  focus order, or optimistic-save timing that are easy to introduce while restyling markup] →
  Mitigate by changing only presentation (classes/markup structure), not event handlers or state
  logic, and by running the existing test suite plus a manual pass through each `expense-entry`
  keyboard-only scenario after the restyle.
- [Introducing a single `getCategoryColorRoles` helper touched by four+ features increases blast
  radius of any bug in it] → Mitigate with direct unit coverage of the helper (fixed hue in, fixed
  three roles out; AA contrast of `text` on `tint`) independent of any one screen's tests.
- [Tailwind v4 `@theme`-based tokens are new to this codebase] → Mitigate by introducing the token
  block first, in isolation, and confirming existing screens still render before touching
  component markup.

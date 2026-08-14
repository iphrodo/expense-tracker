# Kickoff prompt — personal expense tracker

> Paste everything below the line into the coding agent (Claude Code / Cursor) in a repo
> where OpenSpec is already initialised (`openspec init`) and `transactions.csv` sits in `/seed`.

---

## Your task

Create an OpenSpec change proposal for the initial version of a personal expense tracker,
then implement it after I approve the proposal.

**Do not write application code until the proposal is approved.** First produce the change
artifacts, run `openspec validate --strict`, and stop for my review.

## OpenSpec deliverables (phase 1)

Create `openspec/changes/add-expense-tracker-mvp/` containing:

- `proposal.md` — why, what changes, non-goals
- `design.md` — stack decisions, data model, the averages algorithm, offline strategy
- `tasks.md` — ordered, checkable implementation tasks
- `specs/expense-entry/spec.md`
- `specs/expense-analytics/spec.md`
- `specs/data-import/spec.md`

Write requirements as `## ADDED Requirements` with `### Requirement: ...` using SHALL, and at
least one `#### Scenario:` per requirement. Keep scenarios testable — every performance claim
below must appear as a scenario with a concrete number, not as prose.

If any requirement below is ambiguous or two of them conflict, list the conflicts at the top of
`proposal.md` and ask me before resolving them yourself.

## Product context

This replaces a Google Sheets workbook I have kept daily for nine months (~1800 transactions,
29 categories, EUR). The spreadsheet works; the app has to earn the switch.

**The single success criterion: logging one expense must take under 5 seconds and no more than
3 taps, on a phone, one-handed.** If entry is slower than the spreadsheet, I will go back to
the spreadsheet within two weeks and the analytics will not matter. Treat every other feature
as subordinate to this. When a design choice trades entry speed for anything else — polish,
correctness of edge cases, feature completeness — entry speed wins, and note the trade in
`design.md`.

## Stack

- React 19 + TypeScript, Vite
- **Dexie (IndexedDB)** for storage — local-first, no server, no network on the entry path
- Installable PWA with an offline service worker (I enter expenses on my phone, often in shops
  with bad signal)
- Tailwind for styling
- Vitest for the averages logic

Rationale to record in `design.md`: the data is single-user and small enough that a server adds
latency and failure modes to the one path that must never be slow. A desktop-only SQLite build
was rejected because the primary device is a phone. Keep all persistence behind a small
repository module so a future sync backend can be added without touching the UI.

## Data model

```
Category      id, name, isDaily, isArchived, sortOrder
Transaction   id, date, categoryId, amountEur, note, createdAt
MonthFlag     month (YYYY-MM), isComplete  // manual override for incomplete months
AverageExclusion  categoryId, month (YYYY-MM), reason?   // unique on (categoryId, month)
```

`amountEur` is stored in **integer cents**, never floats. The source spreadsheet accumulated
rounding drift through float arithmetic; do not reproduce it.

## Capability: expense entry

- The app **opens directly on the entry screen**. Not a dashboard, not a month list. Entry is
  the home screen.
- The amount field is focused on mount with a numeric keyboard. No tap needed to start typing.
- The amount field **accepts arithmetic expressions**: `5.96+4.22+4.96` is valid input. On save
  it creates **one transaction per addend**, same date and category. This is how I currently
  batch several taxi rides into one cell, and losing it would make entry slower than Sheets.
  Support `+ - * / ( )`; reject anything else with inline validation, never a modal.
- Categories are **chips, always visible, no dropdown**. Order them by a recency-weighted
  frequency score so my usual eight or so categories fit above the fold without scrolling.
  A search field appears only after tapping "more".
- Date defaults to today. One visible control steps to yesterday. Anything further opens a
  picker — that path may be slow, it is rare.
- Note is optional and collapsed by default.
- Saving returns immediately to an empty entry screen and shows a **toast with Undo** for a few
  seconds. No confirmation dialog, no navigation away, no success screen.
- Writes are optimistic: the UI must not wait on IndexedDB before clearing the form.

Scenario to include: entering an amount, picking an already-visible category, and saving
requires exactly 3 taps and no scrolling.

## Capability: expense analytics

Three read-only views. These may be as slow as they need to be.

**Month view** — all transactions for a month, grouped by category, with a total. Shows every
transaction as recorded, including ones excluded from averages. Excluded categories are marked,
never hidden.

**Averages view** — per-category average per month, with these rules:

- A month counts only if it is complete: `month < current month`, unless a `MonthFlag`
  overrides it.
- **The divisor is per-category, computed from the months that actually contributed.** Never a
  single shared divisor. A category first used three months ago is divided by 3, not by 9.
- An `AverageExclusion` removes that category-month from **both the numerator and the
  divisor**. Removing it from only the numerator is a bug that silently deflates the average —
  cover this with a unit test.
- Each row displays `monthsCounted` alongside the average, so a one-off purchase reading
  "347 €/mo over 1 month" is legible as a one-off.
- Guard division by zero when every month of a category is excluded.

**Daily run-rate** — total of `isDaily` categories for the current month divided by days elapsed,
plus the projection to a full month. This replaces `=ROUND(J3/DAY(TODAY()), 2)` in the sheet.

Exclusions are managed from the month view: each category row has a toggle to exclude that
category-month from averages, with an optional reason. The averages view lists active
exclusions and allows removing them.

## Capability: data import

A one-time seed importing `/seed/transactions.csv`:

```
date, category, amount_eur, note, is_daily, source_sheet
```

- Create categories from distinct `category` values, setting `isDaily` from the column.
- Ignore `source_sheet` — it is migration provenance only.
- The import is idempotent: running it twice must not duplicate rows.
- Report counts on completion and fail loudly on a malformed row rather than skipping it.

Also add CSV export of all transactions in the same shape. I am not locking myself into this
app's storage, and a local-only database with no export is one wiped browser profile away from
losing nine months of data.

## Out of scope for this change

Do not build: budgets or limits, multi-currency, recurring transactions, charts, sync or
accounts, receipt photos, income tracking, tags or trip grouping, an editable category manager
beyond rename and archive. Note them in `proposal.md` as deferred. I will add them myself later.

## Quality bar

- Strict TypeScript, no `any`.
- The averages logic lives in pure functions taking transactions and exclusions and returning
  results — no Dexie calls inside it — so it is unit-testable without a database.
- Unit tests are required for: per-category divisor, exclusion removing month from both sides,
  expression parsing including rejection cases, and the zero-divisor guard.
- No UI library beyond Tailwind. Keep the entry screen's component tree shallow.

Start with `proposal.md`.

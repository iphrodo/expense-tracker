## Context

See proposal.md - Why. This is a net-new app; there is no existing codebase or database to
integrate with. The binding constraint on every decision below is that expenses are logged on a
**desktop computer, in the evening, in a batch** — the original brief assumed phone-first,
one-handed, interrupted entry in a shop, which was wrong about actual usage and has been corrected
in proposal.md. The design now optimizes for keyboard-driven batch entry at a desk, while keeping
the app usable (not the primary design target) on a phone. Where a choice trades entry speed for
something else, that trade is called out explicitly.

## Goals / Non-Goals

**Goals:**
- Zero-friction keyboard batch entry — amount focus persists across saves, category selection and
  save both work without leaving the keyboard, no network round trip or blocking storage wait on
  the save path.
- A complete correction path — editing or deleting a transaction is as fast and low-ceremony as
  creating one, since an evening batch typed at speed will contain typos.
- Correct per-category averages divisor, bidirectional month completeness, and exclusion handling
  (this is the part of the sheet formula the user has to hand-check today).
- A storage design that does not lock the data into this app.

**Non-Goals:**
- Multi-device sync, accounts, or any server component (explicitly deferred; see proposal.md).
- Pixel-perfect design polish — Tailwind defaults and a shallow component tree are enough.
- Handling concurrent writers to the same IndexedDB (single user, single device, single tab
  assumed for this change).
- Optimizing the mouse/chip entry path beyond "it still works" — the keyboard path is what batch
  entry at a desk actually uses; chips remain for the occasional one-off or phone use.

## Decisions

### No backend; Dexie/IndexedDB only
The data is single-user and small (1763 rows today, growing by a few rows a day). A server adds a
network hop and a failure mode to the one path — entry — that must never be slow; the app must
work with no network at all, since it is local-first by design, not because of any particular
device's connectivity. Rejected alternative: a small sync server from day one — adds latency and
an availability dependency for no benefit at this data size. Rejected alternative: a desktop-only
native build (e.g. embedding SQLite) — even though desktop is now the primary device, a native
build would mean maintaining a separate distribution per platform and would drop the "usable on a
phone away from the desk" fallback for free that an installable PWA gives; IndexedDB behind Dexie
keeps one codebase that runs anywhere a browser does.

**Trade for entry speed:** because there's no server, there's no cross-device access and no
backup beyond the device itself. Mitigated by CSV export (data-import capability) rather than by
adding sync — sync is out of scope for this change.

### All persistence behind a repository module
Dexie calls are isolated behind a small repository module (e.g. `src/db/repository.ts`) with
plain-object in/out — no Dexie types leak into UI components or into the averages logic. This
keeps a future sync backend a swap of the repository's implementation, not a UI rewrite, and lets
the averages logic (see below) be tested with plain arrays instead of a real database.

### Averages logic as pure functions, no Dexie inside
Per proposal's quality bar, the averages/run-rate calculations are pure functions:
`computeAverages(transactions, exclusions, monthFlags, now) -> AverageRow[]`. Algorithm:
1. Determine complete months: start from `month < currentMonth(now)`, then apply every
   `MonthFlag` as an override in whichever direction it points — `isComplete: true` adds a month
   that the default rule would have excluded (typically the current month); `isComplete: false`
   removes a month the default rule would have included (typically a partial first tracked
   month). A `MonthFlag` affects every category's computation for that month, not just one.
2. Group remaining transactions by `(categoryId, month)`.
3. Drop any `(categoryId, month)` group present in `AverageExclusion`.
4. For each category: `total = sum(group amounts for that category across all surviving months)`,
   `monthsCounted = count(distinct surviving months for that category)`.
5. `average = monthsCounted === 0 ? null : total / monthsCounted`. A `null` average renders as a
   dash in the UI (guards div-by-zero per spec).
This keeps the divisor inherently per-category (step 4 groups by category first), rather than
computing one shared divisor across categories — satisfying the "never a single shared divisor"
requirement structurally, not just by test coverage.

### Amount field: expression parser, not a full math library
A small hand-written recursive-descent parser (or a minimal shunting-yard implementation) handles
`+ - * / ( )` over decimal literals — no third-party expression-eval dependency, to keep the
bundle small and avoid `eval`/`Function` (security: never evaluate arbitrary user input as JS).
For the "one transaction per addend" behavior, the parser keeps the top-level parse tree and only
splits on `+`/`-` at the outermost precedence level (so `(3+4)*2` stays one transaction, but
`5.96+4.22+4.96` becomes three, matching the spec scenarios). A leading unary `-` on the first
top-level term is grammatically distinct from a splitting `-`: it negates that term without
introducing a split, so `-50.78` alone parses as one term, while `17.03-10.50` parses as two terms
(`+17.03`, `-10.50`). Each resulting term's sign carries through to its transaction's amount, so
negative amounts (refunds) are a natural consequence of the grammar, not a special case — the only
extra check is rejecting any term (or the whole expression) that evaluates to exactly 0, at parse
time, before any transaction is created. Amounts are parsed to integer cents immediately (parse
decimal string → round to nearest cent), never passed through floating-point EUR arithmetic, to
avoid the rounding drift the spreadsheet had. The edit-mode amount field reuses this same parser
but rejects any input that would produce more than one top-level term, since editing one
transaction must not fan out into several.

### Category selection: keyboard type-ahead as the primary path, chips as a mouse affordance
Two independent selection mechanisms sit side by side: a type-ahead field reached via `Tab` from
the amount field (filters the full category list as the user types, arrow keys or continued
typing to confirm — no pointer required), and the pre-existing always-visible chip list for
mouse/pointer use. Chip ordering is a decay-weighted frequency score over recent transactions
(e.g. exponential decay by transaction recency, or a simple "count of uses in last N days,
weighted toward more recent"); the exact decay constant is an implementation detail tunable after
real usage data exists — it does not affect the spec, which only requires that the ~8 most-used
categories surface above the fold on a desktop-sized viewport. This is computed client-side from
the transaction table at render time (no separate frequency table) since the transaction count is
small. **Trade:** maintaining two selection paths (type-ahead and chips) is more UI surface than
one, but the keyboard path is what batch entry at a desk actually uses, while chips remain useful
for a one-off entry or on a phone — dropping either would regress one of the two real usage
patterns.

### Keyboard-driven save loop
`Enter` triggers save and, on success, moves focus back to the (now empty) amount field in the
same handler — no intermediate render where focus is unset, so a fast typist's next keystroke is
never dropped. This is what makes "log N transactions with no mouse" possible: amount → `Tab` →
type-ahead category → `Enter` → (focus back on amount) → repeat.

### Date persistence within a session
The current entry date lives in component state (or a lightweight session-scoped store), not in
IndexedDB and not derived fresh from `Date.now()` on every render — it is initialized to today on
mount and only reset to today again on a fresh app load (a new mount of the root entry component
after a full reload), never on save. This directly supports the evening-batch use case: one date
is typically reused for the whole session.

### Editing and deleting transactions
Edit and delete reuse the entry screen's repository functions (`update`, `delete`) rather than
introducing a separate write path, and reuse its Undo-toast mechanism for delete, so the two flows
share behavior instead of duplicating it. Edit opens from the month view (tapping/clicking a
transaction row) with the same amount/category/date/note fields pre-filled; the amount field is
the same component as entry's but configured to reject a multi-term result (see the expression
parser decision above). Editing preserves `importRowIndex` unchanged — the edit only touches
amount/category/date/note fields, never the import-identity field — so idempotency and export
round-tripping are unaffected by a later correction. Analytics views subscribe to the repository
(e.g. via Dexie's live-query support, or an equivalent reactive read) so create/edit/delete/undo
are reflected without a manual reload, per the "reflect writes" analytics requirement.

### Optimistic writes on the entry path
`save()` in the repository returns immediately after handing the write to Dexie (fire-and-forget
from the UI's perspective) — the UI clears the form and shows the undo toast without awaiting the
IndexedDB transaction. Undo, if activated, issues a delete for the just-created transaction id(s)
(kept in component state for the toast's lifetime); if the underlying write is still in flight,
the delete is queued behind it in Dexie's own transaction queue, which serializes automatically.
**Trade for entry speed:** a write failure (e.g. storage quota exceeded) will not be caught before
the form clears; it surfaces asynchronously (e.g. a non-blocking error toast) rather than blocking
save. This favors the common case (writes succeed) over surfacing the rare failure synchronously.

### PWA / offline
A Vite PWA plugin (e.g. `vite-plugin-pwa`) generates the service worker and manifest so the app is
installable and its shell/assets are available offline. This is not about compensating for a
phone's connectivity — it follows directly from the app being local-first with no server: the
service worker's job is purely serving cached app shell assets on any device, since there is no
API traffic to intercept or queue in the first place.

### CSV parsing and idempotency key
A small, dependency-light CSV parser (hand-rolled or a minimal library) reads
`/seed/transactions.csv` for import and produces the export in the same shape. Import runs as an
explicit user action (not automatic on load).

**Idempotency key is the CSV's `row_index` column, not a content tuple.** An earlier version of
this design used `(date, category, amount_eur, note)` as the dedup key; that is wrong for this
dataset, because the source spreadsheet batched several purchases into one cell
(`=5.96+4.22+4.96`) and the migration expanded each addend into its own row — so multiple genuine
transactions legitimately share date, category, and amount. A content-based key silently
collapses those into one, dropping real transactions with no error. `row_index` is instead
assigned once, stably, when the CSV is generated from the spreadsheet, and is required to be
unique within the file (a duplicate `row_index` is a malformed-row error, not silently
resolved).

To check `row_index` against what's already imported without adding an unbounded index scan, the
`Transaction` schema (see proposal.md's data model) gains one field beyond what was originally
specified: `importRowIndex?: number`, set only on transactions created by the CSV importer and
left `undefined` for transactions created via the entry screen. It is indexed in Dexie so
"already imported?" is an indexed lookup, not a table scan. On export, transactions that carry an
`importRowIndex` re-emit it as `row_index`; transactions with no `importRowIndex` (entered
directly in the app) are assigned a newly minted unique index at export time so the exported file
stays self-consistent and re-importable.

**Count/sum assertion.** The importer accepts an `{ expectedRowCount, expectedAmountSum }`
argument. After parsing the whole file (before writing anything), it compares the number of data
rows parsed and the sum of their `amount_eur` values (in integer cents) against these expected
values and aborts with no writes if either mismatches. This catches a truncated download or a
copy/paste error in `/seed/transactions.csv` that a per-row malformed check would not catch,
since a truncated file can still be row-by-row well-formed. The expected values are supplied by
the caller (e.g. hardcoded in the one-time import script/UI action, computed once from the known-
good source spreadsheet export) rather than derived from the file itself, since a self-referential
check can't catch a wholesale-truncated file.

**Verified totals for the checked-in seed file:** 1763 data rows, 29 distinct categories, and an
`amount_eur` sum of 36442.17 EUR (including 25 negative/refund rows totalling -617.49 EUR). These
are the literal `expectedRowCount` (1763) and `expectedAmountSum` (3644217 cents) values wired
into the one-time import action (see tasks.md). **If `/seed/transactions.csv` is ever
regenerated, these two numbers must be recomputed and updated at the same time**, or the
assertion will fail the (now-correct) new import.

**Negative `amount_eur` is valid input, not malformed.** The seed data includes refunds recorded
as negative amounts against their original category (e.g. a travel refund). The importer treats a
negative, well-formed decimal exactly like a positive one; only non-numeric or unparseable values
are malformed.

## Risks / Trade-offs

- **[Risk] Hand-written expression parser has a bug on an edge case (e.g. unary minus, nested
  parens) → Mitigation:** unit tests cover parsing and rejection per the quality bar; scope is
  intentionally small (`+ - * / ( )` over decimals only).
- **[Risk] IndexedDB storage is lost if the browser profile is wiped, since there is no server
  copy → Mitigation:** CSV export capability exists specifically so the user can get data out
  independent of the app; this is a conscious trade (see proposal.md, data-import).
- **[Risk] Optimistic writes mean a failed save is invisible until after the form has cleared →
  Mitigation:** accepted trade per "entry speed wins" instruction; a non-blocking failure toast
  is the fallback, not a blocking check before clearing the form.
- **[Trade] Recency-weighted category ordering is heuristic and may occasionally surface a
  less-relevant category above a rare-but-wanted one → Mitigation:** the "more" search path
  always reaches any category; this is explicitly an acceptable slow path per the product spec.
- **[Risk] Editing an existing transaction's amount into a multi-term expression is a plausible
  typo (muscle memory from entry mode) → Mitigation:** rejected inline per the edit-mode
  requirement rather than silently splitting one record into several, which would be a much more
  surprising failure than a validation message.

## Open Questions

- Exact decay function/constant for the recency-weighted category score — tunable post-launch
  without changing the spec or task breakdown, since the spec only requires "usual ~8 categories
  above the fold."

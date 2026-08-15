## Context

See `proposal.md` - Why. Two additional facts shape this design:

- `src/db/repository.ts` is already the sole persistence seam: no Dexie type crosses it (see
  `src/db/schema.ts`, which is storage-agnostic and reused as-is), and `useCategories` /
  `useTransactions` / `useMonthFlags` / `useExclusions` are the only read hooks components call.
  The averages/run-rate/parser logic (`src/lib/*`) takes plain data and has its own unit tests. If
  implementation surfaces a screen component that needs to change for a reason other than auth or
  async error handling, that is a sign this boundary leaked, and it should be flagged rather than
  patched around.
- The existing per-transaction CSV export (`src/lib/csv.ts`, columns `row_index, date, category,
  amount_eur, note, is_daily, source_sheet`) has no columns for `month_flags` or
  `average_exclusions`, and its shape is load-bearing for the "CSV export of all transactions" and
  re-import idempotency requirements in the `data-import` capability. Overloading it with two more
  tables' worth of columns would either break that contract or produce an awkward, mostly-empty
  CSV. Verified against the user's own export (`expense-tracker-export-2026-08-14.csv`, 1768 rows):
  it has exactly those seven columns and nothing else, so `month_flags` (which months are marked
  complete) and `average_exclusions` (the user's real, already-recorded July 2026 exclusions for
  "Іжа в закладі", "Таксі", and "Солодке") do not survive an export/import round-trip today. That
  is silent data loss — the app keeps working and keeps showing plausible averages, just wrong
  ones, with nothing to indicate the numbers shifted. See "Full-fidelity backup format (JSON)"
  below for the fix, which is built in the current Dexie app, before any Supabase work, precisely
  so the migration's input file can be the new exporter's output rather than the lossy CSV.

## Goals / Non-Goals

**Goals:**
- Replace the repository implementation and add auth, without touching the pure logic layer or its
  tests.
- Make the migration's correctness checkable from data the script itself computes, never from a
  number written down in this document.
- Ship RLS as the actual security boundary, since the publishable key is not a secret.

**Non-Goals:**
- Any sync/merge strategy beyond last-write-wins — see proposal.md Out of scope.
- Preserving the ability to work fully offline. The service worker keeps the app shell installable,
  but data operations require connectivity from this change forward.

## Decisions

### Full-fidelity backup format (JSON, not CSV)
Built in the current Dexie app, before any Supabase work, as a permanent feature — not throwaway
migration tooling. It is section 1 of `tasks.md`, ahead of schema and client work, because the
migration's input file must come from it: the existing CSV is verified lossy (see Context above),
so re-exporting with the new exporter is a blocking manual step before migration can proceed.

**Format decision: a single JSON file, not CSV (or several CSVs).** CSV is a flat, single-table
format. Expressing four related tables (`categories`, `transactions`, `month_flags`,
`average_exclusions`) in it means either four separate files — which the user can partially lose,
mismatch versions of, or forget to attach one of — or one CSV with a unioned, mostly-empty-per-row
schema, which is exactly the awkward shape the existing transaction CSV was kept clean of (see
Context above). This export exists for machine round-tripping (backup restore, migration input),
not spreadsheet viewing — the existing per-transaction CSV already covers the "open it in a
spreadsheet" use case and is kept unchanged for that purpose. A single JSON file keeps the four
tables atomically together as one artifact, supports typed/nested values natively (integers,
booleans, optional fields) without the string-parsing ambiguity CSV forces, and needs no
multi-file bookkeeping on import. **Rejected**: multiple CSVs (file-count bookkeeping burden, no
gain over JSON for a machine-only format) and a unioned single CSV (awkward schema, breaks the
existing transaction-CSV contract if reused, or duplicates it if not).

Shape:
```json
{
  "version": 1,
  "exportedAt": "<ISO 8601>",
  "categories":         [{ "id", "name", "isDaily", "isArchived", "sortOrder" }],
  "transactions":       [{ "id", "date", "categoryId", "amountCents", "note", "importRowIndex" }],
  "monthFlags":         [{ "month", "isComplete" }],
  "averageExclusions":  [{ "categoryId", "month", "reason" }]
}
```
- `amountCents` is the integer already in storage, written directly — no decimal-string
  round-trip. The existing CSV writes `4.6` in one row and `4.60` in another; parsing those back
  through floats is an avoidable source of drift that this format sidesteps entirely.
- `date` is `YYYY-MM-DD`; `month` values are normalised to the first of the month.
- Relations are carried by `categoryId`, not category name, so renaming a category can't silently
  break a transaction's or exclusion's link to it.
- `version` is present from the start (starting at `1`) so a future format change is detectable
  and import can reject a file it doesn't understand with a clear message, instead of
  misinterpreting it.

**UI**: labeled "Export data (backup)" (JSON, all four tables) vs "Export transactions (CSV)"
(flat, transactions only) in `ImportExportScreen.tsx`, so the two are never confused and the user
doesn't reach for the lossy one when taking a backup. Import is symmetric: a JSON backup file
replaces all four tables' contents inside a single Dexie transaction (no partial application on
failure), validating the file before writing anything — unrecognized `version`; duplicate category
ids; duplicate `importRowIndex` values; a duplicate `(categoryId, month)` in
`averageExclusions`; or any `transactions`/`averageExclusions` entry referencing a `categoryId`
not present in `categories`. It reports per-table counts on completion. The existing CSV
export/import (`src/lib/csv.ts`, `src/features/import/importer.ts`) is unchanged.

### Schema and constraints
SQL migration file at `supabase/migrations/0001_init.sql` (checked in, applied via Supabase CLI or
dashboard SQL editor — either way the file is the source of truth, not manual clicks):

```sql
create table categories (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  is_daily     boolean not null default false,
  is_archived  boolean not null default false,
  sort_order   integer not null default 0
);

create table transactions (
  id                 bigint generated always as identity primary key,
  date               date not null,
  category_id        bigint not null references categories(id) on delete restrict,
  amount_cents       integer not null check (amount_cents <> 0),
  note               text not null default '',
  import_row_index   integer unique,
  created_at         timestamptz not null default now()
);

create table month_flags (
  id           bigint generated always as identity primary key,
  month        date not null unique,
  is_complete  boolean not null
);

create table average_exclusions (
  id           bigint generated always as identity primary key,
  category_id  bigint not null references categories(id) on delete restrict,
  month        date not null,
  reason       text not null default '',
  unique (category_id, month)
);

alter table categories enable row level security;
alter table transactions enable row level security;
alter table month_flags enable row level security;
alter table average_exclusions enable row level security;

-- one policy per table, per operation, granted to authenticated only (repeat pattern for all four tables)
create policy "authenticated full access" on categories
  for all to authenticated using (true) with check (true);
-- ...same for transactions, month_flags, average_exclusions
```

`date`/`month` as Postgres `date` (not `timestamptz`) and `amount_cents` as `integer` (not
`numeric`) are non-negotiable per proposal.md — a timestamp shifts an evening entry into the next
UTC day, and a float can misround a cent. `month` is always normalised to the first of the month
before being written, matching the app's existing string convention (`YYYY-MM-01`-equivalent).

**Alternative considered**: `numeric(10,2)` for amounts, mirroring the EUR-decimal CSV format.
Rejected — the app's own domain model (`src/lib/money.ts`) already works in integer cents
end-to-end; converting at the boundary would reintroduce the float-rounding risk the MVP explicitly
avoided.

### Repository rewrite
`src/db/repository.ts` keeps its current exported function names and signatures (`createTransactions`,
`updateTransaction`, `deleteTransaction`, `restoreTransaction`, `getOrCreateCategory`,
`setMonthFlag`, `setExclusion`, etc.) so call sites in `src/features/**` need no changes beyond
error handling. Internally each function becomes a `supabase.from(...)` call. The `useX()` read
hooks (currently Dexie `useLiveQuery`) become simple fetch-on-mount-and-after-mutation hooks backed
by a small in-memory cache invalidated after each successful write — there is no realtime
subscription (see proposal.md Out of scope), so "without a reload" (required by expense-analytics)
is satisfied by re-fetching after the write resolves, not by a live subscription.

### Optimistic-write failure handling
The entry form's save handler already clears the form before the write settles (existing
behavior). The change is: wrap the repository call, and on rejection, re-populate the form's state
from the payload that was about to be saved and surface a toast-style non-blocking error distinct
from the existing Undo toast. Because the form-clearing and the write are already decoupled (the
MVP proposal called this out as intentional for keyboard batch speed), this is an additive
try/catch at the call site — it does not require restructuring the form's state machine. The same
wrapper (save → optimistic UI update → await → restore-and-error on failure) is reused for edit and
delete.

### Auth
`@supabase/supabase-js`'s built-in session handling (`persistSession: true`, `autoRefreshToken:
true`, default `localStorage` storage) covers "persists and auto-refreshes" without custom code. A
top-level `<AuthGate>` component wraps the existing app root: renders the sign-in form when
`supabase.auth.getSession()` resolves to no session, subscribes to `onAuthStateChange` to react to
sign-out, and renders the existing Month view otherwise. No routing changes.

### Config and fail-fast
`src/lib/supabase.ts` reads `import.meta.env.VITE_SUPABASE_URL` and
`import.meta.env.VITE_SUPABASE_ANON_KEY` at module load and throws synchronously if either is
empty, so a misconfigured deploy fails at app boot (a blank error screen with a clear message) 
instead of inside the first query a user happens to trigger.

### Service worker
`vite-plugin-pwa`'s `workbox.runtimeCaching` currently has no entry (the existing `globPatterns`
only precaches build assets, so Supabase's `https://*.supabase.co/rest/v1/*` calls are already not
precached). The task is to add an explicit `NetworkOnly` runtime-caching rule for the Supabase REST
and Auth origins so no caching layer (including any future default Workbox behavior) can serve a
stale API response, and to confirm this with a test that a second, stale-cache load reflects a
write made from another device against the same account.

**Reminder for deployment**: `VITE_*` values are inlined by Vite at build time. Changing them in
Vercel's project settings has no effect until the next deploy is triggered.

## Risks / Trade-offs

- **No attribution** → accepted per proposal.md; a `localStorage` per-device signature is the noted
  deferred option if this becomes a problem.
- **Last-write-wins on a rare simultaneous edit** → accepted; the two-person, evening-review usage
  pattern makes true concurrent writes unlikely, and no locking/merge is built.
- **RLS misconfiguration would expose all data to any anonymous client** → mitigated by the
  scenario-per-table tests in the `auth` spec and by keeping the policy pattern identical (full
  access to `authenticated`, none to `anon`) across all four tables rather than hand-tuning each.
- **The load script (Postgres-writing side) is throwaway migration tooling** → mitigated by
  verifying it thoroughly once (see `data-migration` spec) rather than building it for repeat use;
  it is deleted after migration (tracked as a task). The JSON backup exporter/importer it consumes
  is a separate, permanent feature of the Dexie app (see `data-backup` spec) and is not deleted.
- **Deleting the seed CSV retires the "one-time CSV seed import" requirement** → this is called out
  explicitly as a REMOVED requirement in the `data-import` delta spec, with "Import from a
  user-picked file" as the documented replacement path for any future one-off CSV import need.

## Migration Plan

See `tasks.md` for the ordered checklist. Summary: **full-fidelity JSON backup export/import built
first, in the current Dexie app** → schema → client rewrite behind auth (deployed but pointed at an
empty Postgres) → user re-exports with the new exporter (blocking manual step; the old CSV is not
an acceptable substitute) → load script run against that file and verified → user confirms figures
in the app → only then remove the Dexie code path and delete the seed CSV. Rollback before the
final cleanup step is simply "keep using the deployed app against local IndexedDB" (unaffected,
since Dexie isn't removed until after verification); rollback after cleanup would mean re-adding
Dexie from git history, which is why cleanup is deliberately last.

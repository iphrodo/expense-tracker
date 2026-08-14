## Why

The app currently stores everything in a per-browser IndexedDB, so the two people who share this
household budget cannot see or edit the same data — whoever enters an expense on their own machine
is the only one who ever sees it. Moving persistence to a shared Supabase Postgres database, with
the app deployed on Vercel, makes the data genuinely shared while keeping the entry experience the
app was built around.

## What Changes

- Add a full-fidelity JSON backup export/import to the current Dexie app, covering all four local
  tables (`categories`, `transactions`, `month_flags`, `average_exclusions`). This ships **first**,
  before any Supabase work, because the existing CSV export is verified lossy — it has no columns
  for month flags or average exclusions, so the user's real, already-recorded July 2026 average
  exclusions would be silently dropped by a migration that used the CSV as input. The user
  re-exporting with the new exporter is a blocking manual step before the data migration (below)
  may proceed; the CSV file is not an acceptable substitute. The existing CSV export/import is kept
  unchanged for spreadsheet viewing, and the two are labeled distinctly in the UI ("Export data
  (backup)" vs "Export transactions (CSV)") so the lossy one is never reached for by mistake.
- Add Supabase Postgres tables for `categories`, `transactions`, `month_flags`, and
  `average_exclusions`, delivered as a checked-in SQL migration, with Row Level Security enabled on
  every table (full access for `authenticated`, none for `anon` — the publishable key ships inside
  the client bundle, so RLS is the only real access boundary).
- Add a minimal email/password sign-in screen backed by one shared Supabase account (not per-person
  accounts). No signup, no password reset, no user management UI. Session persists and
  auto-refreshes so the user isn't asked to sign in every evening.
- Rewrite `src/db/repository.ts` against `@supabase/supabase-js`, keeping its exported function
  signatures close to their current shape. Delete Dexie and its dependency.
- **BREAKING**: Optimistic writes (save, edit, delete) can now fail over the network. The entry
  form still clears immediately and refocuses for batch entry, but a failed write now restores the
  entry into the form and shows a non-blocking error instead of silently discarding it.
- **BREAKING**: Offline entry is no longer supported. The service worker is revised to cache only
  the app shell and must never cache Supabase API responses, or one person's entry would stay
  invisible to the other behind a stale cache.
- **BREAKING**: The one-click "import `/seed/transactions.csv`" affordance is retired. The seed CSV
  file is deleted from `public/` once the live data has been migrated to Postgres, since it is now
  stale (transactions have been entered in the app since the original seed).
- One-time data migration: the user exports their current IndexedDB data using the new full-fidelity
  backup exporter (not CSV), and a load script reads that export and writes it into Postgres inside
  a single transaction, verifying row count, category count, grand total, and per-month totals
  against the export before committing. Nothing local is deleted until this verification passes and
  the user confirms the app shows the same figures as before.
- Deploy to Vercel (project `expense-tracker`, Vite preset), with `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` supplied as build-time env vars.

**Accepted trade-off**: there is no `created_by` attribution and no per-user data scoping — every
transaction is anonymous with respect to who entered it, since both people share one Supabase
account. A per-device signature stored in `localStorage` is noted as a deferred option that would
add attribution without adding friction at entry time, but is not built now.

## Capabilities

### New Capabilities
- `data-backup`: A full-fidelity JSON export/import in the current Dexie app, covering all four
  local tables (`categories`, `transactions`, `month_flags`, `average_exclusions`) with typed,
  integer amounts and id-based relations. Permanent feature, built first (ahead of schema and
  client work), distinct from and in addition to the existing per-transaction CSV export/import.
  Its output is the required input to the `data-migration` load script.
- `auth`: Email/password sign-in screen that gates the whole app, backed by a single shared
  Supabase account; persistent, auto-refreshing session; low-prominence sign-out. No signup,
  password reset, or user management.
- `data-migration`: A load script that takes a `data-backup` export file, computes figures from it,
  writes it into Postgres transactionally, and verifies counts and totals against the file before
  committing and before any local data is discarded.

### Modified Capabilities
- `expense-entry`: The "Saving is optimistic with no confirmation or navigation" requirement is
  rewritten to be storage-agnostic (no more assumption that the local write cannot fail) and
  extended to cover failure: a failed save, edit, or delete restores the entry to the form and
  shows a non-blocking error rather than silently losing it.
- `data-import`: The one-click "import `/seed/transactions.csv`" requirement is retired — the seed
  file is deleted from `public/` once the migration to Postgres is verified, so the one-click seed
  import affordance and its handler are removed from the UI. The user-picked-file import and CSV
  export requirements are unaffected.

## Impact

- **Code**: new `src/lib/backup.ts` (JSON backup build/parse/validate), new functions
  `getAllData`/`replaceAllData` in `src/db/repository.ts`, and new "Export data (backup)"/"Import a
  backup" controls in `src/features/import/ImportExportScreen.tsx`, all built first against the
  current Dexie app. `src/db/repository.ts` (rewritten against Supabase), `src/db/schema.ts` (kept as the
  shared type shape), `src/db/db.ts` (deleted, Dexie-specific), a new `src/lib/supabase.ts` client
  and a new sign-in screen/auth guard, `vite.config.ts` (service worker `workbox` config revised to
  exclude Supabase API calls from caching), `src/features/import/ImportExportScreen.tsx` (seed
  import button removed), `public/seed/transactions.csv` (deleted, as a late step).
- **Dependencies**: add `@supabase/supabase-js` (latest, for `sb_publishable_…` key support);
  remove `dexie` and `dexie-react-hooks`.
- **Infra**: new Supabase project (Postgres + Auth), one manually-created shared account, a
  checked-in SQL migration file, a new Vercel project `expense-tracker` wired to GitHub `main`.
- **Config**: new `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the app
  fails fast at startup if either is missing.
- **Out of scope**: two-way sync, offline write queue, conflict resolution, realtime updates,
  multiple distinct users, per-user permissions, attribution, audit log, password reset.

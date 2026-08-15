## 1. Full-fidelity backup export/import (Dexie app, before any Supabase work)

- [x] 1.1 Define the JSON backup format in `src/lib/backup.ts` — `version`, `exportedAt`,
      `categories` (`id`, `name`, `isDaily`, `isArchived`, `sortOrder`), `transactions` (`id`,
      `date`, `categoryId`, `amountCents`, `note`, `importRowIndex`), `monthFlags` (`month`,
      `isComplete`), `averageExclusions` (`categoryId`, `month`, `reason`) — per the `data-backup`
      spec. `amountCents` is written as the stored integer directly, never round-tripped through a
      decimal string; `month` values are normalised to the first of the month.
- [x] 1.2 Implement `buildBackup`/`serializeBackup` (export) and `parseBackup` (import) in
      `src/lib/backup.ts`. `parseBackup` rejects, before anything is written: an unrecognised
      `version`; duplicate category ids; duplicate `importRowIndex` values; a duplicate
      `(categoryId, month)` in `averageExclusions`; or any `transactions`/`averageExclusions` entry
      referencing a `categoryId` not present in `categories` — each with a clear error message.
- [x] 1.3 Add `getAllData` and `replaceAllData` to `src/db/repository.ts`: `replaceAllData` clears
      and rewrites all four Dexie tables inside a single transaction, with no partial application
      on failure, and returns per-table counts.
- [x] 1.4 Add "Export data (backup)" and "Import a backup" controls to
      `src/features/import/ImportExportScreen.tsx`. Relabel the existing CSV export button
      "Export transactions (CSV)" so the two are clearly distinguished and the lossy one is never
      reached for by mistake when taking a backup. The existing CSV export/import behavior is
      otherwise unchanged.
- [x] 1.5 Round-trip test: seed a database with categories, transactions, month flags, and average
      exclusions; export; import into an empty database; assert all four tables match the
      originals exactly, including `amountCents`, `importRowIndex`, and exclusion `reason` values.
- [x] 1.6 Add validation tests: unrecognised version, duplicate category id, duplicate
      `importRowIndex`, duplicate `(categoryId, month)` exclusion, and a dangling `categoryId`
      reference are each rejected before any write.
- [x] 1.7 **Manual, blocking**: re-export using the new "Export data (backup)" button and confirm
      the JSON's `averageExclusions` array has the expected number of entries — the July 2026
      exclusions for "Іжа в закладі", "Таксі", and "Солодке" are known to exist, so an empty array
      means the export is still lossy and must be fixed before proceeding to section 2.

## 2. Supabase project and schema

- [x] 2.1 Create the Supabase project and, by hand in the dashboard, the one shared email/password
      account used by both people.
- [x] 2.2 Write the checked-in SQL migration (`supabase/migrations/0001_init.sql`) creating
      `categories`, `transactions`, `month_flags`, `average_exclusions` with the column types,
      check constraint on `amount_cents <> 0`, and the FK/unique constraints from design.md.
- [x] 2.3 Enable Row Level Security on all four tables and add the `authenticated`-full-access /
      `anon`-no-access policy to each.
- [x] 2.4 Apply the migration to the Supabase project and confirm via the dashboard that RLS is
      enabled on all four tables.

## 3. Client dependencies and config

- [x] 3.1 Add `@supabase/supabase-js` (latest) to `package.json`.
- [x] 3.2 Add `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` placeholder
      values.
- [x] 3.3 Create `src/lib/supabase.ts`: builds the client from `VITE_SUPABASE_URL` /
      `VITE_SUPABASE_ANON_KEY`, throwing synchronously with a clear message if either is missing.

## 4. Auth

- [x] 4.1 Build the sign-in screen (email/password fields, submit, inline error on failure) per the
      `auth` spec — no signup or password-reset UI.
- [x] 4.2 Build `<AuthGate>` wrapping the app root: shows the sign-in screen with no session, the
      existing Month view with a session; subscribes to `onAuthStateChange`.
- [x] 4.3 Add a low-prominence sign-out control.
- [x] 4.4 Confirm session persistence: sign in, reload the app, confirm no sign-in prompt
      reappears.

## 5. Repository rewrite

- [x] 5.1 Rewrite `src/db/repository.ts` against `supabase.from(...)` calls, keeping every current
      exported function name and signature.
- [x] 5.2 Rewrite the `useCategories` / `useTransactions` / `useMonthFlags` / `useExclusions` hooks
      as fetch-on-mount-and-after-mutation (no realtime subscription), per design.md.
- [x] 5.3 Add restore-on-failure + non-blocking-error handling to save, edit, and delete call sites,
      per the modified `expense-entry` requirements (including the mid-batch-failure scenario).
- [x] 5.4 Delete `src/db/db.ts` and the `dexie` / `dexie-react-hooks` dependencies from
      `package.json`.
- [x] 5.5 Run the existing unit test suite (averages, run-rate, CSV parser, backup round-trip)
      unchanged and confirm it still passes without modification. If any test needs to change, stop
      and explain why before changing it.

## 6. Integration tests

- [x] 6.1 Stand up a local Postgres or a disposable Supabase instance for integration tests.
- [x] 6.2 Test: loading/writing the same data twice is idempotent where the app's own logic expects
      it (e.g. re-running the migration load script).
- [x] 6.3 Test: a negative `amount_cents` transaction round-trips unchanged.
- [x] 6.4 Test: a `date` value does not shift across a UTC/local timezone boundary on write and
      read-back.
- [x] 6.5 Test: the unique constraint on `average_exclusions(category_id, month)` is enforced.

## 7. Service worker

- [x] 7.1 Add an explicit `NetworkOnly` runtime-caching rule in `vite.config.ts`'s `workbox` config
      for the Supabase REST/Auth origin(s), so no response from those origins is ever cached.
- [x] 7.2 Verify: with the app already loaded (and its shell cached), a write made from a second
      browser/device against the same account is visible after a reload without a hard refresh or
      cache clear.

## 8. Deployment

- [x] 8.1 Create the Vercel project `expense-tracker` (Vite preset, root `./`), connect it to the
      GitHub repo's `main` branch for auto-deploy.
- [x] 8.2 Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel's project environment
      variables and trigger a deploy (confirm: changing these later requires a new deploy, not just
      a settings save).
- [x] 8.3 Confirm the deployed app requires sign-in and, once signed in, reads/writes the shared
      Postgres data.

## 9. Data migration — load tooling

- [x] 9.1 Write the load script, taking a `data-backup` export file's path as an argument (never
      hardcoded, and never the per-transaction CSV — see the `data-migration` spec): computes row
      count, distinct category count, and amount sum from the file; prints them; writes all four
      tables inside a single Postgres transaction.
- [x] 9.2 Add post-write verification to the load script: re-read row count, category count, amount
      sum, and per-month totals from Postgres; compare each against the figures computed from the
      file (never a hardcoded constant); roll back the transaction on any mismatch and report which
      figure(s) didn't match.

## 10. Data migration — execution (blocking manual steps)

- [x] 10.1 **Manual, blocking**: on the machine whose browser holds the authoritative local data,
      use the app's "Export data (backup)" action (built in section 1) to produce a fresh export
      file. This is the migration input — do not substitute the old seed CSV or an export taken
      before section 1 shipped.
- [x] 10.2 Run the load script against that export file and confirm it reports success (all figures
      matched, transaction committed).
- [x] 10.3 **Manual, blocking**: compare the figures the load script printed (row count, category
      count, grand total, per-month totals) against what the app currently displays for the same
      data, and confirm they match before proceeding.
- [x] 10.4 Point the deployed app at the now-populated Postgres project (if not already, per task
      8.2) and confirm both people can see the migrated data from their own machines.

## 11. Cleanup (only after migration is verified — last steps)

- [x] 11.1 Remove the seed-import button/handler and its `/seed/transactions.csv` fetch from
      `src/features/import/ImportExportScreen.tsx`, per the removed `data-import` requirement.
- [x] 11.2 Delete `public/seed/transactions.csv`.
- [x] 11.3 Delete the load script built in section 9, now that the migration is complete. The
      `data-backup` export/import built in section 1 is a permanent feature and is NOT deleted.
- [x] 11.4 Run `openspec validate --strict` and the full test suite one more time before closing out
      the change.

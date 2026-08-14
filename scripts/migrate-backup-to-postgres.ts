// One-time migration: loads a `data-backup` export (see src/lib/backup.ts) into the
// shared Supabase Postgres project, verifying figures before committing.
//
// This is throwaway migration tooling (deleted once the migration is verified — see
// openspec/changes/add-shared-backend/tasks.md task 11.3). It talks to Postgres
// directly (not via supabase-js/PostgREST) because the load must happen inside a
// single database transaction that can be rolled back on a verification mismatch,
// which the REST API doesn't support.
//
// Usage (either form):
//   MIGRATION_DATABASE_URL=postgres://postgres:<password>@<host>:5432/postgres \
//     npx tsx scripts/migrate-backup-to-postgres.ts <path-to-backup.json>
// or, if the password contains characters a URL can't hold unencoded (@ : / ? # %),
// use discrete fields instead — this avoids URL parsing entirely:
//   MIGRATION_PGHOST=... MIGRATION_PGPORT=5432 MIGRATION_PGDATABASE=postgres \
//   MIGRATION_PGUSER=... MIGRATION_PGPASSWORD=... \
//     npx tsx scripts/migrate-backup-to-postgres.ts <path-to-backup.json>
import { readFileSync } from 'node:fs'
import dns from 'node:dns'
import { Client } from 'pg'
import { parseBackup, BackupParseError, type ParsedBackup } from '../src/lib/backup.ts'

// Some networks silently drop the IPv6 route to Supabase's Postgres hosts instead of
// rejecting it, so Node's default (IPv6-first) DNS resolution hangs indefinitely even
// though `psql` (OS-level resolution) connects instantly. Force IPv4.
dns.setDefaultResultOrder('ipv4first')

function monthOf(date: string): string {
  return date.slice(0, 7)
}

/** Inserts rows in chunked multi-row statements instead of one row per round-trip. */
async function batchInsert(
  client: Client,
  table: string,
  columns: string[],
  rows: unknown[][],
  chunkSize = 500,
): Promise<void> {
  if (rows.length === 0) return
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const values: unknown[] = []
    const tuples = chunk.map((row, rowIndex) => {
      const placeholders = row.map((_, colIndex) => `$${rowIndex * row.length + colIndex + 1}`)
      values.push(...row)
      return `(${placeholders.join(', ')})`
    })
    await client.query(
      `insert into ${table} (${columns.join(', ')}) values ${tuples.join(', ')}`,
      values,
    )
  }
}

function computeFileFigures(backup: ParsedBackup) {
  const rowCount = backup.transactions.length
  const categoryCount = backup.categories.length
  const amountSum = backup.transactions.reduce((sum, t) => sum + t.amountCents, 0)
  const perMonthTotals = new Map<string, number>()
  for (const t of backup.transactions) {
    const month = monthOf(t.date)
    perMonthTotals.set(month, (perMonthTotals.get(month) ?? 0) + t.amountCents)
  }
  return { rowCount, categoryCount, amountSum, perMonthTotals }
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: tsx scripts/migrate-backup-to-postgres.ts <path-to-backup.json>')
    process.exit(1)
  }
  const databaseUrl = process.env.MIGRATION_DATABASE_URL
  const discrete = {
    host: process.env.MIGRATION_PGHOST,
    port: process.env.MIGRATION_PGPORT ? Number(process.env.MIGRATION_PGPORT) : undefined,
    database: process.env.MIGRATION_PGDATABASE,
    user: process.env.MIGRATION_PGUSER,
    password: process.env.MIGRATION_PGPASSWORD,
  }
  if (!databaseUrl && !discrete.host) {
    console.error(
      'Missing connection info: set either MIGRATION_DATABASE_URL, or MIGRATION_PGHOST/' +
        'MIGRATION_PGPORT/MIGRATION_PGDATABASE/MIGRATION_PGUSER/MIGRATION_PGPASSWORD.',
    )
    process.exit(1)
  }

  const text = readFileSync(filePath, 'utf8')
  let backup: ParsedBackup
  try {
    backup = parseBackup(text)
  } catch (err) {
    if (err instanceof BackupParseError) {
      console.error(`Not a valid data-backup export: ${err.message}`)
      process.exit(1)
    }
    throw err
  }

  const fileFigures = computeFileFigures(backup)
  console.log('Figures computed from the export file:')
  console.log(`  rows (transactions): ${fileFigures.rowCount}`)
  console.log(`  categories:          ${fileFigures.categoryCount}`)
  console.log(`  amount sum (cents):  ${fileFigures.amountSum}`)
  console.log(`  per-month totals:    ${JSON.stringify([...fileFigures.perMonthTotals.entries()])}`)

  const host = discrete.host ?? new URL(databaseUrl!).hostname
  const isLocal = /localhost|127\.0\.0\.1/.test(host)
  const client = discrete.host
    ? new Client({
        host: discrete.host,
        port: discrete.port ?? 5432,
        database: discrete.database ?? 'postgres',
        user: discrete.user,
        password: discrete.password,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      })
    : new Client({
        connectionString: databaseUrl,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      })
  console.log(`Connecting to ${host}:${discrete.port ?? 5432}...`)
  client.on('error', (err) => console.error('Client error event:', err))
  const failsafe = setTimeout(() => {
    console.error('Hard timeout: did not finish within 120s. Exiting.')
    process.exit(1)
  }, 120000)
  await client.connect()
  console.log('Connected. Starting transaction...')

  try {
    await client.query('BEGIN', [])
    console.log('BEGIN OK.')

    await client.query('DELETE FROM average_exclusions', [])
    console.log('Deleted average_exclusions.')
    await client.query('DELETE FROM transactions', [])
    console.log('Deleted transactions.')
    await client.query('DELETE FROM month_flags', [])
    console.log('Deleted month_flags.')
    await client.query('DELETE FROM categories', [])
    console.log('Deleted categories.')

    const categoryIdMap = new Map<number, number>()
    for (const category of backup.categories) {
      const result = await client.query<{ id: number }>(
        `insert into categories (name, is_daily, is_archived, sort_order)
         values ($1, $2, $3, $4) returning id`,
        [category.name, category.isDaily, category.isArchived, category.sortOrder],
      )
      categoryIdMap.set(category.id, result.rows[0]!.id)
    }

    const transactionRows = backup.transactions.map((tx) => {
      const categoryId = categoryIdMap.get(tx.categoryId)
      if (categoryId === undefined) {
        throw new Error(`Transaction ${tx.id} references unmapped categoryId ${tx.categoryId}`)
      }
      return [tx.date, categoryId, tx.amountCents, tx.note, tx.importRowIndex ?? null]
    })
    await batchInsert(
      client,
      'transactions',
      ['date', 'category_id', 'amount_cents', 'note', 'import_row_index'],
      transactionRows,
    )
    console.log(`Inserted ${transactionRows.length} transactions.`)

    if (backup.monthFlags.length > 0) {
      await batchInsert(
        client,
        'month_flags',
        ['month', 'is_complete'],
        backup.monthFlags.map((flag) => [flag.month, flag.isComplete]),
      )
    }
    console.log(`Inserted ${backup.monthFlags.length} month flags.`)

    const exclusionRows = backup.averageExclusions.map((exclusion) => {
      const categoryId = categoryIdMap.get(exclusion.categoryId)
      if (categoryId === undefined) {
        throw new Error(`Exclusion references unmapped categoryId ${exclusion.categoryId}`)
      }
      return [categoryId, exclusion.month, exclusion.reason]
    })
    if (exclusionRows.length > 0) {
      await batchInsert(client, 'average_exclusions', ['category_id', 'month', 'reason'], exclusionRows)
    }
    console.log(`Inserted ${exclusionRows.length} average exclusions.`)

    const rowCountResult = await client.query<{ count: string }>(
      'select count(*)::int as count from transactions',
      [],
    )
    const categoryCountResult = await client.query<{ count: string }>(
      'select count(*)::int as count from categories',
      [],
    )
    const amountSumResult = await client.query<{ sum: string | null }>(
      'select sum(amount_cents)::bigint as sum from transactions',
      [],
    )
    const perMonthResult = await client.query<{ month: string; sum: string }>(
      `select to_char(date_trunc('month', date), 'YYYY-MM') as month, sum(amount_cents)::bigint as sum
       from transactions group by 1`,
      [],
    )

    const pgRowCount = Number(rowCountResult.rows[0]!.count)
    const pgCategoryCount = Number(categoryCountResult.rows[0]!.count)
    const pgAmountSum = Number(amountSumResult.rows[0]!.sum ?? 0)
    const pgPerMonthTotals = new Map(
      perMonthResult.rows.map((row) => [row.month, Number(row.sum)]),
    )

    const mismatches: string[] = []
    if (pgRowCount !== fileFigures.rowCount) {
      mismatches.push(`row count: file=${fileFigures.rowCount} postgres=${pgRowCount}`)
    }
    if (pgCategoryCount !== fileFigures.categoryCount) {
      mismatches.push(`category count: file=${fileFigures.categoryCount} postgres=${pgCategoryCount}`)
    }
    if (pgAmountSum !== fileFigures.amountSum) {
      mismatches.push(`amount sum: file=${fileFigures.amountSum} postgres=${pgAmountSum}`)
    }
    const allMonths = new Set([...fileFigures.perMonthTotals.keys(), ...pgPerMonthTotals.keys()])
    for (const month of allMonths) {
      const fileTotal = fileFigures.perMonthTotals.get(month) ?? 0
      const pgTotal = pgPerMonthTotals.get(month) ?? 0
      if (fileTotal !== pgTotal) {
        mismatches.push(`month ${month} total: file=${fileTotal} postgres=${pgTotal}`)
      }
    }

    if (mismatches.length > 0) {
      await client.query('ROLLBACK', [])
      console.error('Verification FAILED, rolled back. Mismatches:')
      for (const m of mismatches) console.error(`  - ${m}`)
      process.exit(1)
    }

    await client.query('COMMIT', [])
    console.log('Verification passed. Transaction committed.')
    console.log(`  rows: ${pgRowCount}, categories: ${pgCategoryCount}, amount sum: ${pgAmountSum}`)
  } catch (err) {
    await client.query('ROLLBACK', []).catch(() => {})
    throw err
  } finally {
    clearTimeout(failsafe)
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

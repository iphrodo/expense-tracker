import { useState } from 'react'
import { importSeedCsv, SEED_IMPORT_EXPECTATIONS } from './importer'
import { exportTransactionsToCsv } from '../../lib/csv'
import { buildBackup, parseBackup, serializeBackup, BackupParseError } from '../../lib/backup'
import { getAllData, replaceAllData, useCategories, useTransactions } from '../../db/repository'

function formatBackupImportStatus(report: {
  categories: number
  transactions: number
  monthFlags: number
  averageExclusions: number
}): string {
  return (
    `Restored ${report.categories} categories, ${report.transactions} transactions, ` +
    `${report.monthFlags} month flags, ${report.averageExclusions} average exclusions`
  )
}

function formatImportStatus(report: {
  transactionsCreated: number
  transactionsUpdated: number
  categoriesCreated: number
}): string {
  return (
    `Imported ${report.transactionsCreated} new transactions, created ${report.categoriesCreated} categories` +
    (report.transactionsUpdated > 0
      ? ` (${report.transactionsUpdated} existing transactions updated)`
      : '')
  )
}

export function ImportExportScreen() {
  const [status, setStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backupImporting, setBackupImporting] = useState(false)
  const categories = useCategories()
  const transactions = useTransactions()

  async function handleImport() {
    setImporting(true)
    setStatus(null)
    try {
      const response = await fetch('/seed/transactions.csv')
      if (!response.ok) {
        throw new Error(`Could not load /seed/transactions.csv (${response.status})`)
      }
      const text = await response.text()
      const report = await importSeedCsv(text, SEED_IMPORT_EXPECTATIONS)
      setStatus(formatImportStatus(report))
    } catch (err) {
      setStatus(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function handleFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    setStatus(null)
    try {
      const text = await file.text()
      const report = await importSeedCsv(text)
      setStatus(formatImportStatus(report))
    } catch (err) {
      setStatus(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function handleExport() {
    const csv = exportTransactionsToCsv(transactions, categories)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expense-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBackupExport() {
    const data = await getAllData()
    const backup = buildBackup(
      data.categories,
      data.transactions,
      data.monthFlags,
      data.averageExclusions,
    )
    const json = serializeBackup(backup)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBackupFilePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (
      !window.confirm(
        'This replaces all categories, transactions, month flags, and average exclusions currently stored in this browser with the contents of the backup file. Continue?',
      )
    ) {
      return
    }

    setBackupImporting(true)
    setBackupStatus(null)
    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      const report = await replaceAllData(parsed)
      setBackupStatus(formatBackupImportStatus(report))
    } catch (err) {
      setBackupStatus(
        err instanceof BackupParseError || err instanceof Error
          ? `Import failed: ${err.message}`
          : 'Import failed',
      )
    } finally {
      setBackupImporting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-4">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Export data (backup)</h2>
        <p className="mb-2 text-sm text-neutral-500">
          Downloads every category, transaction, month flag, and average exclusion as a single
          JSON file — the only export that captures everything. Use this for backups; use CSV
          below only for viewing transactions in a spreadsheet.
        </p>
        <button
          type="button"
          onClick={() => void handleBackupExport()}
          className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
        >
          Export data (backup)
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Import a backup</h2>
        <p className="mb-2 text-sm text-neutral-500">
          Pick a JSON file produced by "Export data (backup)". This{' '}
          <strong>replaces all data currently stored in this browser</strong> with the file's
          contents.
        </p>
        <input
          type="file"
          accept=".json,application/json"
          disabled={backupImporting}
          onChange={(e) => void handleBackupFilePicked(e)}
          data-testid="backup-import-file-input"
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-200 file:px-3 file:py-1.5 file:font-semibold file:text-neutral-900 dark:file:bg-neutral-700 dark:file:text-neutral-100"
        />
        {backupStatus && (
          <p className="mt-2 text-sm" data-testid="backup-import-status">
            {backupStatus}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">One-time seed import</h2>
        <p className="mb-2 text-sm text-neutral-500">
          Imports <code>/seed/transactions.csv</code>. Safe to run more than once — already
          imported rows are skipped.
        </p>
        <button
          type="button"
          disabled={importing}
          onClick={() => void handleImport()}
          className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import seed data'}
        </button>
        {status && (
          <p className="mt-2 text-sm" data-testid="import-status">
            {status}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Re-import a corrected file</h2>
        <p className="mb-2 text-sm text-neutral-500">
          Pick a CSV file from disk in the same format as export. Rows whose{' '}
          <code>row_index</code> already exists overwrite that transaction's amount, date,
          category, and note; new <code>row_index</code> values are added as new transactions.
        </p>
        <input
          type="file"
          accept=".csv"
          disabled={importing}
          onChange={(e) => void handleFilePicked(e)}
          data-testid="import-file-input"
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-200 file:px-3 file:py-1.5 file:font-semibold file:text-neutral-900 dark:file:bg-neutral-700 dark:file:text-neutral-100"
        />
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Export transactions (CSV)</h2>
        <p className="mb-2 text-sm text-neutral-500">
          Downloads all {transactions.length} transactions as CSV, in the same shape as import.
          Transactions only — does not include month flags or average exclusions. For a full
          backup, use "Export data (backup)" above.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="rounded border border-neutral-300 px-4 py-2 font-semibold dark:border-neutral-700"
        >
          Export transactions (CSV)
        </button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { importSeedCsv } from './importer'
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
    <div className="mx-auto flex max-w-xl flex-col gap-s5 p-s4">
      <h1 className="t-h1 text-text">Import / Export</h1>

      <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
        <h2 className="t-h2 mb-s2 text-text">Export data (backup)</h2>
        <p className="t-meta mb-s3 text-text-2">
          Downloads every category, transaction, month flag, and average exclusion as a single
          JSON file — the only export that captures everything. Use this for backups; use CSV
          below only for viewing transactions in a spreadsheet.
        </p>
        <button
          type="button"
          onClick={() => void handleBackupExport()}
          className="t-body h-11 rounded-md bg-accent px-s4 font-semibold text-white hover:bg-accent-hover active:bg-accent-press"
        >
          Export data (backup)
        </button>
      </div>

      <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
        <h2 className="t-h2 mb-s2 text-text">Import a backup</h2>
        <p className="t-meta mb-s3 text-text-2">
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
          className="t-meta text-text-2 file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-surface-2 file:px-s3 file:font-semibold file:text-text"
        />
        {backupStatus && (
          <p
            className={`t-meta mt-s2 ${
              backupStatus.startsWith('Import failed')
                ? 'rounded-sm bg-error-weak px-s2 py-s1 text-error'
                : 'text-text-2'
            }`}
            data-testid="backup-import-status"
          >
            {backupStatus}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
        <h2 className="t-h2 mb-s2 text-text">Re-import a corrected file</h2>
        <p className="t-meta mb-s3 text-text-2">
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
          className="t-meta text-text-2 file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-surface-2 file:px-s3 file:font-semibold file:text-text"
        />
        {status && (
          <p
            className={`t-meta mt-s2 ${
              status.startsWith('Import failed') ? 'rounded-sm bg-error-weak px-s2 py-s1 text-error' : 'text-text-2'
            }`}
            data-testid="import-status"
          >
            {status}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-s4 shadow-1">
        <h2 className="t-h2 mb-s2 text-text">Export transactions (CSV)</h2>
        <p className="t-meta mb-s3 text-text-2">
          Downloads all {transactions.length} transactions as CSV, in the same shape as import.
          Transactions only — does not include month flags or average exclusions. For a full
          backup, use "Export data (backup)" above.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="t-body h-11 rounded-md border border-border-strong px-s4 font-semibold text-text hover:bg-surface-2"
        >
          Export transactions (CSV)
        </button>
      </div>
    </div>
  )
}

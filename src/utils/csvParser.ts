import Papa from 'papaparse'
import type { Transaction, CSVImportSettings, CSVColumnMapping } from '@/types'

export interface CSVRow {
  [key: string]: string
}

/** Parse a CSV file → array of raw row objects */
export function parseCsvFile(file: File): Promise<{ headers: string[]; rows: CSVRow[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        const headers = result.meta.fields ?? []
        resolve({ headers, rows: result.data })
      },
      error: reject,
    })
  })
}

/** Parse a date string according to the chosen format */
export function parseDate(raw: string, format: CSVImportSettings['dateFormat']): string | null {
  const clean = raw.trim()
  let y = '', m = '', d = ''

  if (format === 'DD/MM/YYYY') {
    const parts = clean.split(/[.\/\-]/)
    if (parts.length < 3) return null
    ;[d, m, y] = parts
  } else if (format === 'MM/DD/YYYY') {
    const parts = clean.split(/[.\/\-]/)
    if (parts.length < 3) return null
    ;[m, d, y] = parts
  } else {
    // YYYY-MM-DD
    const parts = clean.split(/[.\/\-]/)
    if (parts.length < 3) return null
    ;[y, m, d] = parts
  }

  if (!y || !m || !d) return null
  const dateStr = `${y.padStart(4,'0')}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null
  return dateStr
}

/** Parse an amount string → number */
export function parseAmount(raw: string, decimalSep: '.' | ','): number {
  let clean = raw.trim().replace(/[^\d,.\-]/g, '')
  if (decimalSep === ',') {
    // Remove thousands dots, replace comma decimal
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else {
    // Remove thousands commas
    clean = clean.replace(/,/g, '')
  }
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : Math.abs(n)
}

/** Build a SHA-256 hex hash from date+amount+description for deduplication */
export async function buildImportHash(date: string, amount: number, description: string): Promise<string> {
  const data = `${date}|${amount}|${description}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').slice(0,16)
}

export interface MappedTransaction {
  date: string
  amount: number
  description: string
  type: 'income' | 'expense'
  import_hash: string
  raw: CSVRow
}

/** Apply mapping + settings to parse rows into MappedTransactions */
export async function mapRows(
  rows: CSVRow[],
  mapping: CSVColumnMapping,
  settings: CSVImportSettings,
  existingHashes: Set<string>
): Promise<{
  valid: MappedTransaction[]
  skipped: number
  errors: Array<{ row: number; reason: string }>
}> {
  const valid: MappedTransaction[] = []
  const errors: Array<{ row: number; reason: string }> = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-indexed + header

    // Parse date
    const rawDate = row[mapping.date] ?? ''
    const date = parseDate(rawDate, settings.dateFormat)
    if (!date) {
      errors.push({ row: rowNum, reason: `Invalid date: "${rawDate}"` })
      continue
    }

    // Parse amount
    const rawAmount = row[mapping.amount] ?? ''
    const amount = parseAmount(rawAmount, settings.decimalSeparator)
    if (!amount || amount === 0) {
      errors.push({ row: rowNum, reason: `Invalid amount: "${rawAmount}"` })
      continue
    }

    // Description
    const description = mapping.description ? (row[mapping.description] ?? '').trim() : ''

    // Determine type
    let type: 'income' | 'expense' = 'expense'
    if (mapping.type) {
      const rawType = (row[mapping.type] ?? '').trim().toLowerCase()
      if (settings.type_income_values.some(v => rawType === v.toLowerCase())) {
        type = 'income'
      }
    }

    // Hash for deduplication
    const hash = await buildImportHash(date, amount, description)

    // Skip duplicates
    if (settings.skip_duplicates && existingHashes.has(hash)) {
      skipped++
      continue
    }

    valid.push({ date, amount, description, type, import_hash: hash, raw: row })
  }

  return { valid, skipped, errors }
}

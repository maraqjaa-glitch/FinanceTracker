import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, ChevronRight, CheckCircle, AlertCircle, X } from 'lucide-react'
import TopHeader from '@/components/layout/TopHeader'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useWallets } from '@/hooks/useWallets'
import { useHouseholdStore } from '@/store/householdStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { supabase } from '@/lib/supabase'
import { parseCsvFile, mapRows } from '@/utils/csvParser'
import type { CSVRow, MappedTransaction } from '@/utils/csvParser'
import type { CSVColumnMapping, CSVImportSettings } from '@/types'

// ─── Step types ───────────────────────────────
type Step = 'upload' | 'mapping' | 'preview' | 'done'

const DATE_FORMATS: CSVImportSettings['dateFormat'][] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']

// ─── Main Page ────────────────────────────────
export default function ImportPage() {
  const { t } = useTranslation()
  const { activeHousehold } = useHouseholdStore()
  const { session } = useAuthStore()
  const { addToast } = useUIStore()
  const { data: wallets = [] } = useWallets()

  // ── Step state ──────────────────────────────
  const [step, setStep] = useState<Step>('upload')

  // ── File parsing state ──────────────────────
  const [headers, setHeaders]   = useState<string[]>([])
  const [rows, setRows]         = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Mapping ─────────────────────────────────
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    date: '', amount: '', description: '',
  })

  // ── Settings ────────────────────────────────
  const [settings, setSettings] = useState<CSVImportSettings>({
    dateFormat: 'DD/MM/YYYY',
    decimalSeparator: '.',
    wallet_id: wallets[0]?.id ?? '',
    skip_duplicates: true,
    type_income_values: ['income', 'credit', '+'],
    type_expense_values: ['expense', 'debit', '-'],
  })
  const [typeIncomeStr, setTypeIncomeStr] = useState('income, credit, +')

  // ── Preview / results ────────────────────────
  const [mapped, setMapped]       = useState<MappedTransaction[]>([])
  const [skippedCount, setSkipped] = useState(0)
  const [errorList, setErrors]    = useState<Array<{ row: number; reason: string }>>([])
  const [importedCount, setImported] = useState(0)
  const [importing, setImporting] = useState(false)

  // ─── File upload ──────────────────────────────
  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      addToast({ type: 'error', title: 'Please upload a .csv file' })
      return
    }
    setLoading(true)
    setFileName(file.name)
    try {
      const { headers, rows } = await parseCsvFile(file)
      setHeaders(headers)
      setRows(rows)
      // Auto-detect common column names
      const lower = headers.map(h => h.toLowerCase())
      const autoMapping: CSVColumnMapping = {
        date:        headers[lower.findIndex(h => h.includes('date'))] ?? '',
        amount:      headers[lower.findIndex(h => h.includes('amount') || h.includes('value'))] ?? '',
        description: headers[lower.findIndex(h => h.includes('desc') || h.includes('narr') || h.includes('memo'))] ?? '',
        type:        headers[lower.findIndex(h => h.includes('type') || h.includes('dr') || h.includes('cr'))] || undefined,
      }
      setMapping(autoMapping)
      setSettings(s => ({ ...s, wallet_id: wallets[0]?.id ?? '' }))
      setStep('mapping')
    } catch {
      addToast({ type: 'error', title: 'Failed to parse CSV' })
    }
    setLoading(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [wallets])

  // ─── Build preview ────────────────────────────
  const buildPreview = async () => {
    if (!mapping.date || !mapping.amount) {
      addToast({ type: 'error', title: 'Please map Date and Amount columns' })
      return
    }
    setLoading(true)

    // Fetch existing import hashes for deduplication
    const existingHashes = new Set<string>()
    if (settings.skip_duplicates && activeHousehold) {
      const { data } = await supabase
        .from('transactions')
        .select('import_hash')
        .eq('household_id', activeHousehold.id)
        .not('import_hash', 'is', null)
      ;(data ?? []).forEach(r => { if (r.import_hash) existingHashes.add(r.import_hash) })
    }

    const incomeValues = typeIncomeStr.split(',').map(v => v.trim()).filter(Boolean)
    const updatedSettings = { ...settings, type_income_values: incomeValues }

    const result = await mapRows(rows, mapping, updatedSettings, existingHashes)
    setMapped(result.valid)
    setSkipped(result.skipped)
    setErrors(result.errors)
    setStep('preview')
    setLoading(false)
  }

  // ─── Execute import ───────────────────────────
  const executeImport = async () => {
    if (!activeHousehold || !session) return
    setImporting(true)

    let imported = 0
    const BATCH = 50

    for (let i = 0; i < mapped.length; i += BATCH) {
      const batch = mapped.slice(i, i + BATCH)
      const inserts = batch.map(m => ({
        household_id: activeHousehold.id,
        created_by: session.user.id,
        type: m.type,
        amount: m.amount,
        currency: 'PLN',
        date: m.date,
        description: m.description || null,
        wallet_id: settings.wallet_id || null,
        import_hash: m.import_hash,
        tags: [] as string[],
        is_recurring: false,
        category_id: null,
        to_wallet_id: null,
        savings_envelope_id: null,
        budget_envelope_id: null,
        portfolio_id: null,
        notes: null,
        person: null,
        amount_in_base_currency: null,
        exchange_rate: null,
        recurring_id: null,
      }))
      const { error } = await supabase.from('transactions').insert(inserts)
      if (error) {
        addToast({ type: 'error', title: `Batch ${i / BATCH + 1} failed: ${error.message}` })
      } else {
        imported += batch.length
      }
    }

    setImported(imported)
    setImporting(false)
    setStep('done')
    addToast({ type: 'success', title: `Imported ${imported} transactions` })
  }

  // ─── Reset ────────────────────────────────────
  const resetAll = () => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setFileName('')
    setMapped([])
    setSkipped(0)
    setErrors([])
    setImported(0)
  }

  return (
    <div>
      <TopHeader title={t('import.title')} showBack />

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-1">
          {(['upload','mapping','preview','done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  backgroundColor: step === s ? 'var(--color-accent)' : s < step ? '#10b981' : 'var(--color-bg-elevated)',
                  color: step === s || s < step ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${step === s ? 'var(--color-accent)' : s < step ? '#10b981' : 'var(--color-border)'}`,
                }}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div>
            <div
              className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors"
              style={{ borderColor: 'var(--color-border)' }}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {t('import.dropzone')}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                .csv files only
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>
            {loading && <SkeletonCard lines={3} />}
          </div>
        )}

        {/* ── Step 2: Mapping ── */}
        {step === 'mapping' && (
          <div className="flex flex-col gap-4">
            <div className="card p-4">
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                File: {fileName}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {rows.length} rows, {headers.length} columns
              </p>
            </div>

            {/* Preview first 3 rows */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('import.preview')} (first 3 rows)
              </p>
              <div className="card overflow-hidden overflow-x-auto">
                <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold"
                          style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-2" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column mapping */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('import.mapping')}
              </p>
              <div className="card p-4 flex flex-col gap-3">
                {([
                  { key: 'date', label: `${t('common.date')} *` },
                  { key: 'amount', label: `${t('transactions.amount')} *` },
                  { key: 'description', label: t('transactions.description') },
                  { key: 'type', label: `${t('transactions.type')} (optional)` },
                ] as { key: keyof CSVColumnMapping; label: string }[]).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-xs font-medium w-24 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                      {label}
                    </label>
                    <select
                      value={mapping[key] ?? ''}
                      onChange={e => setMapping(m => ({ ...m, [key]: e.target.value || undefined }))}
                      className="input flex-1 text-xs h-9"
                    >
                      <option value="">— skip —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('import.settings')}
              </p>
              <div className="card p-4 flex flex-col gap-3">
                {/* Date format */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium w-24 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('import.dateFormat')}
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={e => setSettings(s => ({ ...s, dateFormat: e.target.value as CSVImportSettings['dateFormat'] }))}
                    className="input flex-1 text-xs h-9"
                  >
                    {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Decimal separator */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium w-24 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('import.decimalSeparator')}
                  </label>
                  <div className="flex gap-2 flex-1">
                    {(['.', ','] as const).map(sep => (
                      <button
                        key={sep} type="button"
                        onClick={() => setSettings(s => ({ ...s, decimalSeparator: sep }))}
                        className="flex-1 h-9 rounded-xl text-sm font-mono font-bold transition-all"
                        style={{
                          backgroundColor: settings.decimalSeparator === sep ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                          color: settings.decimalSeparator === sep ? '#fff' : 'var(--color-text-secondary)',
                          border: `1px solid ${settings.decimalSeparator === sep ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        }}
                      >
                        1{sep}000
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target wallet */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium w-24 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('import.targetWallet')}
                  </label>
                  <select
                    value={settings.wallet_id}
                    onChange={e => setSettings(s => ({ ...s, wallet_id: e.target.value }))}
                    className="input flex-1 text-xs h-9"
                  >
                    <option value="">— none —</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                  </select>
                </div>

                {/* Income values */}
                {mapping.type && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium w-24 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
                      Income values
                    </label>
                    <input
                      type="text"
                      value={typeIncomeStr}
                      onChange={e => setTypeIncomeStr(e.target.value)}
                      placeholder="income, credit, +"
                      className="input flex-1 text-xs h-9"
                    />
                  </div>
                )}

                {/* Skip duplicates */}
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, skip_duplicates: !s.skip_duplicates }))}
                  className="flex items-center gap-3 text-xs"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  <div
                    className="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                    style={{ backgroundColor: settings.skip_duplicates ? 'var(--color-accent)' : 'var(--color-border)' }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: settings.skip_duplicates ? '1.25rem' : '2px' }}
                    />
                  </div>
                  {t('import.skipDuplicates')}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetAll}
                className="flex-1 h-11 rounded-2xl text-sm"
                style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={buildPreview}
                disabled={loading}
                className="flex-1 h-11 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {loading ? t('common.loading') : `${t('import.preview')} →`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 'preview' && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="card p-4 flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Will import</p>
                <p className="text-xl font-bold" style={{ color: '#10b981' }}>{mapped.length}</p>
              </div>
              <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex-1 text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Skipped</p>
                <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>{skippedCount}</p>
              </div>
              <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex-1 text-center">
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Errors</p>
                <p className="text-xl font-bold" style={{ color: '#ef4444' }}>{errorList.length}</p>
              </div>
            </div>

            {/* Error list */}
            {errorList.length > 0 && (
              <div className="card p-4">
                <p className="text-xs font-semibold mb-2" style={{ color: '#ef4444' }}>
                  Parse errors ({errorList.length})
                </p>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                  {errorList.map((err, i) => (
                    <p key={i} className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      Row {err.row}: {err.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            {mapped.length > 0 && (
              <div className="card overflow-hidden overflow-x-auto">
                <p className="text-xs font-semibold px-4 py-2" style={{ color: 'var(--color-text-muted)' }}>
                  Preview (first 5)
                </p>
                <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                      {['Date','Amount','Description','Type'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold"
                          style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapped.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {row.date}
                        </td>
                        <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                          {row.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 truncate max-w-32" style={{ color: 'var(--color-text-secondary)' }}>
                          {row.description || '—'}
                        </td>
                        <td className="px-3 py-2" style={{ color: row.type === 'income' ? '#10b981' : '#ef4444' }}>
                          {row.type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {mapped.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#f59e0b' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  No valid rows to import
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Check your column mapping and date format
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="flex-1 h-11 rounded-2xl text-sm"
                style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={executeImport}
                disabled={importing || mapped.length === 0}
                className="flex-1 h-11 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {importing ? t('import.importing') : `Import ${mapped.length}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <CheckCircle className="w-16 h-16" style={{ color: '#10b981' }} />
            <div>
              <p className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {t('import.result')}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t('import.imported', { count: importedCount })} &nbsp;·&nbsp;
                {t('import.skipped',  { count: skippedCount })} &nbsp;·&nbsp;
                {t('import.errors',   { count: errorList.length })}
              </p>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="px-6 h-12 rounded-2xl font-semibold text-sm text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Import another file
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

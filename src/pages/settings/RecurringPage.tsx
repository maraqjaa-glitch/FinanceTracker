import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Pause, Play, RefreshCw } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import TopHeader from '@/components/layout/TopHeader'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import {
  useRecurringTransactions, useCreateRecurring, useUpdateRecurring,
  useDeleteRecurring, useToggleRecurring, calcNextDueDate,
} from '@/hooks/useRecurringTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useUIStore } from '@/store/uiStore'
import { txTypeColor } from '@/utils/calculations'
import { formatCurrency } from '@/utils/formatCurrency'
import { toISODate } from '@/utils/formatDate'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import type { RecurringTransaction, TransactionType, RecurringFrequency } from '@/types'
import { getCategoryName } from '@/types'

// ─── Form schema ──────────────────────────────
const schema = z.object({
  type:            z.enum(['income','expense','bill','transfer','savings_deposit','savings_withdrawal','investment']),
  amount:          z.number().positive(),
  currency:        z.string().min(1),
  description:     z.string().min(1),
  frequency:       z.enum(['daily','weekly','monthly','yearly']),
  frequency_value: z.number().int().min(1),
  start_date:      z.string().min(1),
  next_due_date:   z.string().min(1),
  end_date:        z.string().optional(),
  category_id:     z.string().optional(),
  wallet_id:       z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}

const TX_TYPES: TransactionType[] = ['income','expense','bill']

// ─── Form Modal ───────────────────────────────
function RecurringFormModal({ open, onClose, editing }: {
  open: boolean; onClose: () => void; editing?: RecurringTransaction | null
}) {
  const { t } = useTranslation()
  const { language } = useUIStore()
  const create = useCreateRecurring()
  const update = useUpdateRecurring()
  const { data: categories = [] } = useCategories()
  const { data: wallets = [] } = useWallets()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: editing
        ? {
            type: editing.type as TransactionType,
            amount: editing.amount,
            currency: editing.currency,
            description: editing.description,
            frequency: editing.frequency,
            frequency_value: editing.frequency_value,
            start_date: editing.start_date,
            next_due_date: editing.next_due_date,
            end_date: editing.end_date ?? undefined,
            category_id: editing.category_id ?? undefined,
            wallet_id: editing.wallet_id ?? undefined,
          }
        : {
            type: 'expense', amount: 0, currency: 'PLN', description: '',
            frequency: 'monthly', frequency_value: 1,
            start_date: toISODate(new Date()),
            next_due_date: toISODate(new Date()),
          },
    })

  const watchedType      = watch('type')
  const watchedFreq      = watch('frequency')
  const watchedFreqVal   = watch('frequency_value')
  const watchedNextDue   = watch('next_due_date')
  const typeColor        = txTypeColor(watchedType)

  // Auto-recalc next_due_date when frequency changes
  const handleFreqChange = (freq: RecurringFrequency) => {
    setValue('frequency', freq)
    if (watchedNextDue) {
      const next = calcNextDueDate(watchedNextDue, freq, watchedFreqVal ?? 1)
      setValue('next_due_date', next)
    }
  }

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      category_id: values.category_id || null,
      wallet_id:   values.wallet_id   || null,
      end_date:    values.end_date    || null,
      active:      true,
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
    reset()
  }

  const isBusy = isSubmitting || create.isPending || update.isPending

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Recurring' : 'New Recurring Transaction'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* Type */}
        <div>
          <label className="label">{t('transactions.type')}</label>
          <Controller name="type" control={control} render={({ field }) => (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TX_TYPES.map(tp => (
                <button
                  key={tp} type="button"
                  onClick={() => field.onChange(tp)}
                  className="flex-shrink-0 px-3 h-8 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: field.value === tp ? `${txTypeColor(tp)}25` : 'var(--color-bg-card)',
                    border: `1.5px solid ${field.value === tp ? txTypeColor(tp) : 'var(--color-border)'}`,
                    color: field.value === tp ? txTypeColor(tp) : 'var(--color-text-muted)',
                  }}
                >
                  {t(`transactions.types.${tp}`)}
                </button>
              ))}
            </div>
          )} />
        </div>

        {/* Description */}
        <div>
          <label className="label">{t('transactions.description')} *</label>
          <input {...register('description')} className="input" placeholder="e.g. Netflix, Rent…" autoFocus />
          {errors.description && <p className="field-error">Required</p>}
        </div>

        {/* Amount + Currency */}
        <div>
          <label className="label">{t('transactions.amount')}</label>
          <div
            className="flex items-center gap-3 h-14 px-4 rounded-2xl"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: `1px solid ${typeColor}50` }}
          >
            <Controller name="currency" control={control} render={({ field }) => (
              <select {...field} className="bg-transparent outline-none text-sm font-bold flex-shrink-0" style={{ color: typeColor }}>
                {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
            )} />
            <Controller name="amount" control={control} render={({ field }) => (
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                value={field.value || ''}
                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="flex-1 text-2xl font-bold bg-transparent outline-none tabular-nums"
                style={{ color: 'var(--color-text-primary)' }}
              />
            )} />
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="label">{t('transactions.frequency.monthly')} — frequency</label>
          <div className="flex gap-2 flex-wrap">
            <Controller name="frequency" control={control} render={({ field }) => (
              <>
                {(['daily','weekly','monthly','yearly'] as RecurringFrequency[]).map(f => (
                  <button
                    key={f} type="button"
                    onClick={() => handleFreqChange(f)}
                    className="px-3 h-8 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: field.value === f ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                      color: field.value === f ? '#fff' : 'var(--color-text-secondary)',
                      border: `1px solid ${field.value === f ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    }}
                  >
                    {FREQ_LABELS[f]}
                  </button>
                ))}
              </>
            )} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Every</span>
            <Controller name="frequency_value" control={control} render={({ field }) => (
              <input
                type="number" min="1" max="365"
                value={field.value}
                onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                className="input w-16 text-center"
              />
            )} />
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {watchedFreq === 'daily' ? 'day(s)' : watchedFreq === 'weekly' ? 'week(s)' : watchedFreq === 'monthly' ? 'month(s)' : 'year(s)'}
            </span>
          </div>
        </div>

        {/* Start + Next due */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start date</label>
            <input {...register('start_date')} type="date" className="input" />
          </div>
          <div>
            <label className="label">Next due</label>
            <input {...register('next_due_date')} type="date" className="input" />
          </div>
        </div>

        {/* End date (optional) */}
        <div>
          <label className="label">End date ({t('common.optional')})</label>
          <input {...register('end_date')} type="date" className="input" />
        </div>

        {/* Wallet */}
        {wallets.length > 0 && (
          <div>
            <label className="label">{t('transactions.wallet')} ({t('common.optional')})</label>
            <Controller name="wallet_id" control={control} render={({ field }) => (
              <select {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || undefined)} className="input">
                <option value="">— none —</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            )} />
          </div>
        )}

        <button
          type="submit" disabled={isBusy}
          className="w-full h-12 rounded-2xl font-semibold text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {isBusy ? '...' : t('common.save')}
        </button>
      </form>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────
export default function RecurringPage() {
  const { t } = useTranslation()
  const { language } = useUIStore()

  const [formOpen, setFormOpen]   = useState(false)
  const [editing, setEditing]     = useState<RecurringTransaction | null>(null)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [deleteDesc, setDeleteDesc] = useState('')

  const { data: recurring = [], isLoading } = useRecurringTransactions()
  const deleteMut = useDeleteRecurring()
  const toggleMut = useToggleRecurring()
  const { data: categories = [] } = useCategories()

  const active   = recurring.filter(r => r.active)
  const paused   = recurring.filter(r => !r.active)

  const handleEdit = (r: RecurringTransaction) => { setEditing(r); setFormOpen(true) }
  const handleDelete = (r: RecurringTransaction) => { setDeleteId(r.id); setDeleteDesc(r.description) }

  return (
    <div>
      <TopHeader
        title={t('settings.recurring')}
        showBack
        right={
          <button
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {isLoading ? (
          <SkeletonList count={3} />
        ) : recurring.length === 0 ? (
          <EmptyState
            icon="🔄"
            title="No recurring transactions"
            description="Add subscriptions, salaries, or any repeating transaction"
            action={
              <button
                onClick={() => { setEditing(null); setFormOpen(true) }}
                className="px-5 h-10 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                Add recurring
              </button>
            }
          />
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {t('common.active')} ({active.length})
                </p>
                <div className="flex flex-col gap-2">
                  {active.map(r => (
                    <RecurringRow
                      key={r.id}
                      item={r}
                      language={language}
                      onEdit={() => handleEdit(r)}
                      onDelete={() => handleDelete(r)}
                      onToggle={() => toggleMut.mutate({ id: r.id, active: false })}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paused */}
            {paused.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Paused ({paused.length})
                </p>
                <div className="flex flex-col gap-2">
                  {paused.map(r => (
                    <RecurringRow
                      key={r.id}
                      item={r}
                      language={language}
                      onEdit={() => handleEdit(r)}
                      onDelete={() => handleDelete(r)}
                      onToggle={() => toggleMut.mutate({ id: r.id, active: true })}
                      paused
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <RecurringFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleteId}
        title={`Delete "${deleteDesc}"?`}
        description="This will permanently remove the recurring rule. Past transactions are preserved."
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteMut.isPending}
        onConfirm={async () => { await deleteMut.mutateAsync(deleteId!); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

// ─── Recurring Row ────────────────────────────
function RecurringRow({ item: r, language, onEdit, onDelete, onToggle, paused = false }: {
  item: RecurringTransaction
  language: string
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  paused?: boolean
}) {
  const { t } = useTranslation()
  const color = txTypeColor(r.type)
  const { language: lang } = useUIStore()

  const freqLabel = `Every ${r.frequency_value > 1 ? r.frequency_value + ' ' : ''}${r.frequency}${r.frequency_value > 1 ? 's' : ''}`
  const nextLabel = r.next_due_date
    ? `Next: ${format(new Date(r.next_due_date + 'T00:00:00'), 'd MMM yyyy')}`
    : ''

  return (
    <div
      className="card p-4 flex items-center gap-3"
      style={{ opacity: paused ? 0.6 : 1 }}
    >
      {/* Type dot */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <RefreshCw className="w-4 h-4" style={{ color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
          {r.description}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {freqLabel} · {nextLabel}
        </p>
      </div>

      {/* Amount */}
      <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color }}>
        {formatCurrency(r.amount, r.currency, language)}
      </p>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center rounded-xl"
          style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)' }}
          title={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-xl"
          style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-elevated)' }}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-xl"
          style={{ color: '#ef444470', backgroundColor: 'var(--color-bg-elevated)' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

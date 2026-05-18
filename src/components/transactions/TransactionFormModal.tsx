import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import CategoryPicker from './CategoryPicker'
import type { TransactionType, CategoryType } from '@/types'
import { toISODate } from '@/utils/formatDate'
import { useCreateTransaction, useUpdateTransaction, useTransaction } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useCategories } from '@/hooks/useCategories'
import { useSavingsEnvelopes } from '@/hooks/useSavingsEnvelopes'
import { usePortfolios } from '@/hooks/usePortfolios'
import { useUIStore } from '@/store/uiStore'
import { getCategoryName } from '@/types'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import { txTypeColor } from '@/utils/calculations'

// ─── Types that map to a CategoryType ────────
const TYPE_TO_CATEGORY: Partial<Record<TransactionType, CategoryType>> = {
  income: 'income', expense: 'expense', bill: 'bill',
}

const TX_TYPES: TransactionType[] = [
  'income','expense','bill','transfer','savings_deposit','savings_withdrawal','investment',
]

const TYPE_ICONS: Record<TransactionType, string> = {
  income: '💚', expense: '🔴', bill: '🟠',
  transfer: '🔁', savings_deposit: '💙', savings_withdrawal: '💙', investment: '🟣',
}

// ─── Schema ───────────────────────────────────
const schema = z.object({
  type:               z.enum(['income','expense','bill','transfer','savings_deposit','savings_withdrawal','investment']),
  amount:             z.number().positive(),
  currency:           z.string().min(1),
  date:               z.string().min(1),
  category_id:        z.string().optional(),
  wallet_id:          z.string().optional(),
  to_wallet_id:       z.string().optional(),
  savings_envelope_id:z.string().optional(),
  portfolio_id:       z.string().optional(),
  description:        z.string().optional(),
  notes:              z.string().optional(),
  person:             z.string().optional(),
  is_recurring:       z.boolean(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  editId?: string | null
  /** Pre-select a transaction type (e.g. from deposit/withdraw shortcuts) */
  presetType?: TransactionType
  /** Pre-select a savings envelope */
  presetEnvelopeId?: string | null
  /** Pre-select a portfolio (investment type) */
  presetPortfolioId?: string | null
}

export default function TransactionFormModal({
  open, onClose, editId, presetType, presetEnvelopeId, presetPortfolioId,
}: Props) {
  const { t }           = useTranslation()
  const { language }    = useUIStore()
  const { data: wallets = [] }  = useWallets()
  const { data: envelopes = [] } = useSavingsEnvelopes()
  const { data: portfolios = [] } = usePortfolios()
  const createTx = useCreateTransaction()
  const updateTx = useUpdateTransaction()
  const { data: existing } = useTransaction(editId ?? null)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  const { register, handleSubmit, control, watch, setValue, reset, formState: { isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        type: presetType ?? 'expense',
        amount: 0,
        currency: 'PLN',
        date: toISODate(new Date()),
        is_recurring: false,
        savings_envelope_id: presetEnvelopeId ?? undefined,
        portfolio_id: presetPortfolioId ?? undefined,
      },
    })

  const watchedType    = watch('type')
  const watchedCatId   = watch('category_id')
  const categoryType   = TYPE_TO_CATEGORY[watchedType]
  const isSavingsType  = watchedType === 'savings_deposit' || watchedType === 'savings_withdrawal'
  const isInvestment   = watchedType === 'investment'

  const { data: categories = [] } = useCategories(categoryType)
  const selectedCat = categories.find(c => c.id === watchedCatId)

  // Pre-fill when editing or applying presets
  useEffect(() => {
    if (!open) return
    if (existing) {
      reset({
        type: existing.type,
        amount: existing.amount,
        currency: existing.currency,
        date: existing.date,
        category_id: existing.category_id ?? undefined,
        wallet_id: existing.wallet_id ?? undefined,
        to_wallet_id: existing.to_wallet_id ?? undefined,
        savings_envelope_id: existing.savings_envelope_id ?? undefined,
        portfolio_id: existing.portfolio_id ?? undefined,
        description: existing.description ?? undefined,
        notes: existing.notes ?? undefined,
        person: existing.person ?? undefined,
        is_recurring: existing.is_recurring,
      })
    } else {
      reset({
        type: presetType ?? 'expense',
        amount: 0,
        currency: 'PLN',
        date: toISODate(new Date()),
        is_recurring: false,
        savings_envelope_id: presetEnvelopeId ?? undefined,
        portfolio_id: presetPortfolioId ?? undefined,
      })
    }
  }, [existing, editId, open, presetType, presetEnvelopeId, presetPortfolioId, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      category_id:          values.category_id          || null,
      wallet_id:            values.wallet_id            || null,
      to_wallet_id:         values.to_wallet_id         || null,
      savings_envelope_id:  values.savings_envelope_id  || null,
      portfolio_id:         values.portfolio_id         || null,
      description:          values.description          || null,
      notes:                values.notes                || null,
      person:               values.person               || null,
      tags:                 [] as string[],
      budget_envelope_id:   null,
      amount_in_base_currency: null,
      exchange_rate: null,
      import_hash: null,
      recurring_id: null,
    }
    if (editId) {
      await updateTx.mutateAsync({ id: editId, ...payload })
    } else {
      await createTx.mutateAsync(payload)
    }
    onClose()
  }

  const isBusy = isSubmitting || createTx.isPending || updateTx.isPending
  const typeColor = txTypeColor(watchedType)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editId ? t('transactions.editTransaction') : t('transactions.addTransaction')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* ── Type selector ── */}
        <div>
          <label className="label">{t('transactions.type')}</label>
          <Controller name="type" control={control} render={({ field }) => (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TX_TYPES.map(tp => {
                const active = field.value === tp
                return (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => {
                      field.onChange(tp)
                      setValue('category_id', undefined)
                      setValue('savings_envelope_id', undefined)
                      setValue('portfolio_id', undefined)
                    }}
                    className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all"
                    style={{
                      backgroundColor: active ? `${txTypeColor(tp)}25` : 'var(--color-bg-card)',
                      border: `1.5px solid ${active ? txTypeColor(tp) : 'var(--color-border)'}`,
                      color: active ? txTypeColor(tp) : 'var(--color-text-muted)',
                    }}
                  >
                    <span className="text-base">{TYPE_ICONS[tp]}</span>
                    {t(`transactions.types.${tp}`)}
                  </button>
                )
              })}
            </div>
          )} />
        </div>

        {/* ── Amount + Currency ── */}
        <div>
          <label className="label">{t('transactions.amount')}</label>
          <div
            className="flex items-center gap-3 h-16 px-4 rounded-2xl"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: `1px solid ${typeColor}50` }}
          >
            <Controller name="currency" control={control} render={({ field }) => (
              <select
                {...field}
                className="bg-transparent outline-none text-sm font-bold flex-shrink-0"
                style={{ color: typeColor }}
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            )} />
            <Controller name="amount" control={control} render={({ field }) => (
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                value={field.value || ''}
                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="flex-1 text-3xl font-bold bg-transparent outline-none tabular-nums"
                style={{ color: 'var(--color-text-primary)' }}
                autoFocus={!editId}
              />
            )} />
          </div>
        </div>

        {/* ── Date ── */}
        <div>
          <label className="label">{t('transactions.date')}</label>
          <input {...register('date')} type="date" className="input" />
        </div>

        {/* ── Savings envelope selector (savings types only) ── */}
        {isSavingsType && envelopes.length > 0 && (
          <div>
            <label className="label">
              {t('envelopes.savings')} envelope
            </label>
            <Controller name="savings_envelope_id" control={control} render={({ field }) => (
              <select
                {...field}
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value || undefined)}
                className="input"
              >
                <option value="">— {t('common.none')} —</option>
                {envelopes.map(e => (
                  <option key={e.id} value={e.id}>{e.icon} {e.name}</option>
                ))}
              </select>
            )} />
          </div>
        )}

        {/* ── Portfolio selector (investment type only) ── */}
        {isInvestment && portfolios.length > 0 && (
          <div>
            <label className="label">
              Portfolio <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span>
            </label>
            <Controller name="portfolio_id" control={control} render={({ field }) => (
              <select
                {...field}
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value || undefined)}
                className="input"
              >
                <option value="">— {t('common.none')} —</option>
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            )} />
          </div>
        )}

        {/* ── Category (only for expense/income/bill) ── */}
        {categoryType && (
          <div>
            <label className="label">{t('transactions.category')}</label>
            {showCategoryPicker ? (
              <CategoryPicker
                typeFilter={categoryType}
                value={watchedCatId ?? ''}
                onChange={id => setValue('category_id', id)}
                onClose={() => setShowCategoryPicker(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowCategoryPicker(true)}
                className="w-full h-11 px-4 rounded-xl text-sm text-left flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                {selectedCat ? (
                  <>
                    <span>{selectedCat.icon}</span>
                    <span>{getCategoryName(selectedCat, language)}</span>
                  </>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {t('transactions.category')}…
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Wallet ── */}
        {watchedType !== 'transfer' && wallets.length > 0 && (
          <div>
            <label className="label">{t('transactions.wallet')}</label>
            <Controller name="wallet_id" control={control} render={({ field }) => (
              <select {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || undefined)} className="input">
                <option value="">— {t('common.none')} —</option>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            )} />
          </div>
        )}

        {/* ── Transfer: from + to wallets ── */}
        {watchedType === 'transfer' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('common.from')}</label>
              <Controller name="wallet_id" control={control} render={({ field }) => (
                <select {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || undefined)} className="input">
                  <option value="">—</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                </select>
              )} />
            </div>
            <div>
              <label className="label">{t('transactions.toWallet')}</label>
              <Controller name="to_wallet_id" control={control} render={({ field }) => (
                <select {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value || undefined)} className="input">
                  <option value="">—</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                </select>
              )} />
            </div>
          </div>
        )}

        {/* ── Description ── */}
        <div>
          <label className="label">{t('transactions.description')}</label>
          <input {...register('description')} type="text" className="input" placeholder={t('transactions.description') + '…'} />
        </div>

        {/* ── Person (optional) ── */}
        <div>
          <label className="label">{t('transactions.person')} ({t('common.optional')})</label>
          <input {...register('person')} type="text" className="input" placeholder="e.g. Anna" />
        </div>

        {/* ── Notes (optional) ── */}
        <div>
          <label className="label">{t('transactions.notes')} ({t('common.optional')})</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="input h-auto py-2.5"
            style={{ resize: 'none' }}
            placeholder="…"
          />
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isBusy}
          className="w-full h-12 rounded-2xl font-semibold text-sm text-white transition-opacity disabled:opacity-50 mt-1"
          style={{ backgroundColor: typeColor }}
        >
          {isBusy ? '...' : t('common.save')}
        </button>
      </form>
    </Modal>
  )
}

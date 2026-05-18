import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { BudgetEnvelope } from '@/types'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import { useCategories } from '@/hooks/useCategories'
import { getCategoryName } from '@/types'
import { useUIStore } from '@/store/uiStore'
import {
  useCreateBudgetEnvelope,
  useUpdateBudgetEnvelope,
} from '@/hooks/useBudgetEnvelopes'

const ICONS = ['📋','🛒','🍽️','🚗','🏠','💡','📡','🎬','💊','👗','✈️','🎁','🐾','💻','📚']
const COLORS = ['#f59e0b','#f97316','#ef4444','#10b981','#0ea5e9','#6366f1','#8b5cf6','#ec4899','#14b8a6','#84cc16']

const schema = z.object({
  name:          z.string().min(1),
  icon:          z.string().min(1),
  color:         z.string().min(1),
  currency:      z.string().min(1),
  monthly_limit: z.number().positive(),
  category_id:   z.string().optional(),
  rollover:      z.boolean(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  envelope?: BudgetEnvelope | null
}

export default function BudgetEnvelopeFormModal({ open, onClose, envelope }: Props) {
  const { t } = useTranslation()
  const { language } = useUIStore()
  const create = useCreateBudgetEnvelope()
  const update = useUpdateBudgetEnvelope()
  const { data: categories = [] } = useCategories()
  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'bill')

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: '', icon: '📋', color: '#f59e0b',
        currency: 'PLN', monthly_limit: 0, rollover: false,
      },
    })

  useEffect(() => {
    if (envelope) {
      reset({
        name: envelope.name,
        icon: envelope.icon,
        color: envelope.color,
        currency: envelope.currency,
        monthly_limit: envelope.monthly_limit,
        category_id: envelope.category_id ?? undefined,
        rollover: envelope.rollover,
      })
    } else {
      reset({ name: '', icon: '📋', color: '#f59e0b', currency: 'PLN', monthly_limit: 0, rollover: false })
    }
  }, [envelope, open, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:          values.name,
      icon:          values.icon,
      color:         values.color,
      currency:      values.currency,
      monthly_limit: values.monthly_limit,
      category_id:   values.category_id ?? null,
      rollover:      values.rollover,
    }
    if (envelope) {
      await update.mutateAsync({ id: envelope.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const isBusy = isSubmitting || create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={envelope ? t('envelopes.addBudget') : t('envelopes.addBudget')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Icon */}
        <div>
          <label className="label">Icon</label>
          <Controller name="icon" control={control} render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button
                  key={ic} type="button"
                  onClick={() => field.onChange(ic)}
                  className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: field.value === ic ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    border: `1.5px solid ${field.value === ic ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          )} />
        </div>

        {/* Name */}
        <div>
          <label className="label">Envelope name <span className="text-red-400">*</span></label>
          <input {...register('name')} className="input" placeholder="e.g. Groceries" autoFocus />
          {errors.name && <p className="field-error">Required</p>}
        </div>

        {/* Color */}
        <div>
          <label className="label">Colour</label>
          <Controller name="color" control={control} render={({ field }) => (
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => field.onChange(c)}
                  className="w-8 h-8 rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: field.value === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          )} />
        </div>

        {/* Link to category */}
        <div>
          <label className="label">{t('transactions.category')} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span></label>
          <Controller name="category_id" control={control} render={({ field }) => (
            <select
              {...field}
              value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value || undefined)}
              className="input"
            >
              <option value="">— {t('common.none')} —</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {getCategoryName(c, language)}</option>
              ))}
            </select>
          )} />
        </div>

        {/* Currency */}
        <div>
          <label className="label">{t('common.currency')}</label>
          <Controller name="currency" control={control} render={({ field }) => (
            <select {...field} className="input">
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
              ))}
            </select>
          )} />
        </div>

        {/* Monthly limit */}
        <div>
          <label className="label">{t('envelopes.monthlyLimit')} <span className="text-red-400">*</span></label>
          <Controller name="monthly_limit" control={control} render={({ field }) => (
            <input
              type="number" inputMode="decimal" step="0.01" min="0.01"
              value={field.value || ''}
              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
              className="input text-xl font-bold"
              placeholder="0.00"
            />
          )} />
          {errors.monthly_limit && <p className="field-error">Must be greater than 0</p>}
        </div>

        {/* Rollover toggle */}
        <Controller name="rollover" control={control} render={({ field }) => (
          <button
            type="button"
            onClick={() => field.onChange(!field.value)}
            className="flex items-center gap-3 text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <div
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ backgroundColor: field.value ? 'var(--color-accent)' : 'var(--color-border)' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: field.value ? '1.375rem' : '2px' }}
              />
            </div>
            <div>
              <p className="font-medium text-sm">{t('envelopes.rollover')}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Carry unspent budget to next month
              </p>
            </div>
          </button>
        )} />

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

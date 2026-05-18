import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { InvestmentPortfolio, PortfolioType } from '@/types'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import { useCreatePortfolio, useUpdatePortfolio } from '@/hooks/usePortfolios'

const PORTFOLIO_TYPES: { value: PortfolioType; icon: string; labelKey: string }[] = [
  { value: 'stocks',      icon: '📈', labelKey: 'portfolios.types.stocks' },
  { value: 'crypto',      icon: '₿',  labelKey: 'portfolios.types.crypto' },
  { value: 'gold',        icon: '🥇', labelKey: 'portfolios.types.gold' },
  { value: 'bonds',       icon: '📜', labelKey: 'portfolios.types.bonds' },
  { value: 'real_estate', icon: '🏠', labelKey: 'portfolios.types.real_estate' },
  { value: 'pension',     icon: '🏛️', labelKey: 'portfolios.types.pension' },
  { value: 'other',       icon: '💼', labelKey: 'portfolios.types.other' },
]

const TYPE_ICONS: Record<PortfolioType, string> = {
  stocks: '📈', crypto: '₿', gold: '🥇', bonds: '📜',
  real_estate: '🏠', pension: '🏛️', other: '💼',
}

const COLORS = [
  '#8b5cf6','#6366f1','#10b981','#f59e0b','#ef4444',
  '#0ea5e9','#f97316','#ec4899','#14b8a6','#84cc16',
]

const schema = z.object({
  name:        z.string().min(1, 'Required'),
  type:        z.enum(['stocks','crypto','gold','bonds','real_estate','pension','other']),
  icon:        z.string().min(1),
  color:       z.string().min(1),
  currency:    z.string().min(1),
  institution: z.string().optional(),
  notes:       z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  portfolio?: InvestmentPortfolio | null
}

export default function PortfolioFormModal({ open, onClose, portfolio }: Props) {
  const { t } = useTranslation()
  const create = useCreatePortfolio()
  const update = useUpdatePortfolio()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: '', type: 'stocks', icon: '📈', color: '#8b5cf6',
        currency: 'PLN',
      },
    })

  const watchedType = watch('type')

  useEffect(() => {
    if (portfolio) {
      reset({
        name: portfolio.name,
        type: portfolio.type,
        icon: portfolio.icon,
        color: portfolio.color,
        currency: portfolio.currency,
        institution: portfolio.institution ?? undefined,
        notes: portfolio.notes ?? undefined,
      })
    } else {
      reset({ name: '', type: 'stocks', icon: '📈', color: '#8b5cf6', currency: 'PLN' })
    }
  }, [portfolio, open, reset])

  // Auto-update icon when type changes (only in create mode)
  useEffect(() => {
    if (!portfolio) {
      setValue('icon', TYPE_ICONS[watchedType] ?? '💼')
    }
  }, [watchedType, portfolio, setValue])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      type: values.type,
      icon: values.icon,
      color: values.color,
      currency: values.currency,
      institution: values.institution ?? null,
      notes: values.notes ?? null,
    }
    if (portfolio) {
      await update.mutateAsync({ id: portfolio.id, ...payload })
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
      title={portfolio ? t('portfolios.addPortfolio') : t('portfolios.addPortfolio')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Type grid */}
        <div>
          <label className="label">{t('transactions.type')}</label>
          <Controller name="type" control={control} render={({ field }) => (
            <div className="grid grid-cols-4 gap-2">
              {PORTFOLIO_TYPES.map(({ value, icon, labelKey }) => (
                <button
                  key={value} type="button"
                  onClick={() => field.onChange(value)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-[10px] font-semibold transition-all"
                  style={{
                    backgroundColor: field.value === value ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    border: `1px solid ${field.value === value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: field.value === value ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-center leading-tight">{t(labelKey)}</span>
                </button>
              ))}
            </div>
          )} />
        </div>

        {/* Name */}
        <div>
          <label className="label">Name <span className="text-red-400">*</span></label>
          <input {...register('name')} className="input" placeholder="e.g. US Stocks ETF" autoFocus />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        {/* Color */}
        <div>
          <label className="label">Colour</label>
          <Controller name="color" control={control} render={({ field }) => (
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => field.onChange(c)}
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

        {/* Institution (optional) */}
        <div>
          <label className="label">
            Institution <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span>
          </label>
          <input {...register('institution')} className="input" placeholder="e.g. XTB, Revolut" />
        </div>

        {/* Notes (optional) */}
        <div>
          <label className="label">
            {t('transactions.notes')} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span>
          </label>
          <textarea {...register('notes')} rows={2} className="input h-auto py-2.5" style={{ resize: 'none' }} placeholder="…" />
        </div>

        <button type="submit" disabled={isBusy}
          className="w-full h-12 rounded-2xl font-semibold text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}>
          {isBusy ? '...' : t('common.save')}
        </button>
      </form>
    </Modal>
  )
}

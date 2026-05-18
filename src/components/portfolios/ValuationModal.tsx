import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import { toISODate } from '@/utils/formatDate'
import { useAddValuation } from '@/hooks/usePortfolios'

const schema = z.object({
  current_value:   z.number().min(0, 'Must be ≥ 0'),
  valuation_date:  z.string().min(1),
  notes:           z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  portfolioId: string
  portfolioCurrency: string
}

export default function ValuationModal({ open, onClose, portfolioId, portfolioCurrency }: Props) {
  const { t } = useTranslation()
  const addValuation = useAddValuation()

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        current_value: 0,
        valuation_date: toISODate(new Date()),
      },
    })

  const onSubmit = async (values: FormValues) => {
    await addValuation.mutateAsync({
      portfolio_id:   portfolioId,
      current_value:  values.current_value,
      valuation_date: values.valuation_date,
      notes:          values.notes ?? null,
    })
    reset()
    onClose()
  }

  const isBusy = isSubmitting || addValuation.isPending

  return (
    <Modal open={open} onClose={onClose} title={t('portfolios.updateValuation')}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Current value */}
        <div>
          <label className="label">
            {t('portfolios.currentValue')} ({portfolioCurrency}) <span className="text-red-400">*</span>
          </label>
          <Controller name="current_value" control={control} render={({ field }) => (
            <div
              className="flex items-center gap-3 h-16 px-4 rounded-2xl"
              style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            >
              <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
                {portfolioCurrency}
              </span>
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                value={field.value || ''}
                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="flex-1 text-3xl font-bold bg-transparent outline-none tabular-nums"
                style={{ color: 'var(--color-text-primary)' }}
                autoFocus
              />
            </div>
          )} />
          {errors.current_value && <p className="field-error">{errors.current_value.message}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="label">{t('common.date')}</label>
          <input {...register('valuation_date')} type="date" className="input" />
        </div>

        {/* Notes */}
        <div>
          <label className="label">
            {t('transactions.notes')} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span>
          </label>
          <textarea
            {...register('notes')}
            rows={2} className="input h-auto py-2.5"
            style={{ resize: 'none' }}
            placeholder="…"
          />
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

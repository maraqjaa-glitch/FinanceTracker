import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { SavingsEnvelope } from '@/types'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import {
  useCreateSavingsEnvelope,
  useUpdateSavingsEnvelope,
} from '@/hooks/useSavingsEnvelopes'

const ICONS = ['💰','🏠','🚗','✈️','💍','📚','🎓','💻','🏋️','🐣','🌴','🎁','🏦','⛵','🎯']
const COLORS = ['#10b981','#0ea5e9','#6366f1','#8b5cf6','#f59e0b','#f97316','#ef4444','#ec4899','#14b8a6','#84cc16']

const schema = z.object({
  name:            z.string().min(1),
  icon:            z.string().min(1),
  color:           z.string().min(1),
  currency:        z.string().min(1),
  initial_balance: z.number().min(0),
  target_amount:   z.number().positive().optional(),
  target_date:     z.string().optional(),
  notes:           z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  envelope?: SavingsEnvelope | null
}

export default function SavingsEnvelopeFormModal({ open, onClose, envelope }: Props) {
  const { t } = useTranslation()
  const create = useCreateSavingsEnvelope()
  const update = useUpdateSavingsEnvelope()

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: '', icon: '💰', color: '#10b981',
        currency: 'PLN', initial_balance: 0,
      },
    })

  useEffect(() => {
    if (envelope) {
      reset({
        name: envelope.name,
        icon: envelope.icon,
        color: envelope.color,
        currency: envelope.currency,
        initial_balance: envelope.initial_balance,
        target_amount: envelope.target_amount ?? undefined,
        target_date: envelope.target_date ?? undefined,
        notes: envelope.notes ?? undefined,
      })
    } else {
      reset({ name: '', icon: '💰', color: '#10b981', currency: 'PLN', initial_balance: 0 })
    }
  }, [envelope, open, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:            values.name,
      icon:            values.icon,
      color:           values.color,
      currency:        values.currency,
      initial_balance: values.initial_balance,
      target_amount:   values.target_amount ?? null,
      target_date:     values.target_date ?? null,
      notes:           values.notes ?? null,
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
      title={envelope ? t('envelopes.addSavings') : t('envelopes.addSavings')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Icon picker */}
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
          <label className="label">{t('envelopes.addSavings')} name <span className="text-red-400">*</span></label>
          <input {...register('name')} className="input" placeholder="e.g. Emergency Fund" autoFocus />
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

        {/* Initial balance */}
        <div>
          <label className="label">Starting balance</label>
          <Controller name="initial_balance" control={control} render={({ field }) => (
            <input
              type="number" inputMode="decimal" step="0.01" min="0"
              value={field.value ?? ''}
              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
              className="input"
            />
          )} />
        </div>

        {/* Target amount (optional) */}
        <div>
          <label className="label">{t('envelopes.targetAmount')} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span></label>
          <Controller name="target_amount" control={control} render={({ field }) => (
            <input
              type="number" inputMode="decimal" step="0.01" min="0"
              value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="e.g. 10000"
              className="input"
            />
          )} />
        </div>

        {/* Target date (optional) */}
        <div>
          <label className="label">{t('envelopes.targetDate')} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span></label>
          <input {...register('target_date')} type="date" className="input" />
        </div>

        {/* Notes */}
        <div>
          <label className="label">{t('transactions.notes')} <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span></label>
          <textarea
            {...register('notes')}
            rows={2}
            className="input h-auto py-2.5"
            style={{ resize: 'none' }}
            placeholder="…"
          />
        </div>

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

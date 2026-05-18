import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { Wallet, WalletType } from '@/types'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import { useCreateWallet, useUpdateWallet } from '@/hooks/useWallets'

const WALLET_TYPES: WalletType[] = ['bank', 'cash', 'credit_card', 'savings', 'investment', 'other']
const WALLET_ICONS: Record<WalletType, string> = {
  bank: '🏦', cash: '💵', credit_card: '💳',
  savings: '🐷', investment: '📈', other: '👛',
}
const WALLET_COLORS = [
  '#6366f1','#8b5cf6','#10b981','#0ea5e9',
  '#f97316','#ef4444','#f59e0b','#14b8a6','#ec4899',
]

const schema = z.object({
  name:               z.string().min(1),
  type:               z.enum(['bank','cash','credit_card','savings','investment','other']),
  currency:           z.string().min(1),
  icon:               z.string().min(1),
  color:              z.string().min(1),
  initial_balance:    z.number(),
  credit_limit:       z.number().optional(),
  include_in_net_worth: z.boolean(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  wallet?: Wallet | null   // null = create mode
}

export default function WalletFormModal({ open, onClose, wallet }: Props) {
  const { t } = useTranslation()
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: '', type: 'bank', currency: 'PLN',
        icon: '🏦', color: '#6366f1',
        initial_balance: 0, include_in_net_worth: true,
      },
    })

  const watchedType = watch('type')

  // Pre-fill when editing
  useEffect(() => {
    if (wallet) {
      reset({
        name: wallet.name, type: wallet.type as WalletType,
        currency: wallet.currency, icon: wallet.icon,
        color: wallet.color, initial_balance: wallet.initial_balance,
        credit_limit: wallet.credit_limit ?? undefined,
        include_in_net_worth: wallet.include_in_net_worth,
      })
    } else {
      reset({ name: '', type: 'bank', currency: 'PLN', icon: '🏦', color: '#6366f1', initial_balance: 0, include_in_net_worth: true })
    }
  }, [wallet, reset, open])

  // Auto-set icon when type changes
  useEffect(() => { setValue('icon', WALLET_ICONS[watchedType] ?? '👛') }, [watchedType, setValue])

  const onSubmit = async (values: FormValues) => {
    if (wallet) {
      await updateWallet.mutateAsync({ id: wallet.id, ...values })
    } else {
      await createWallet.mutateAsync({
        name: values.name,
        type: values.type,
        currency: values.currency,
        icon: values.icon,
        color: values.color,
        initial_balance: values.initial_balance,
        credit_limit: values.credit_limit,
        include_in_net_worth: values.include_in_net_worth,
      })
    }
    onClose()
  }

  const isBusy = isSubmitting || createWallet.isPending || updateWallet.isPending

  return (
    <Modal open={open} onClose={onClose} title={wallet ? t('wallets.editWallet') : t('wallets.addWallet')}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Name */}
        <div>
          <label className="label">{t('common.new')} — {t('wallets.title')}</label>
          <input {...register('name')} placeholder="e.g. PKO Bank" className="input" />
          {errors.name && <p className="field-error">Required</p>}
        </div>

        {/* Type */}
        <div>
          <label className="label">{t('wallets.types.bank')}</label>
          <Controller name="type" control={control} render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {WALLET_TYPES.map(wt => (
                <button key={wt} type="button"
                  onClick={() => field.onChange(wt)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: field.value === wt ? 'var(--color-accent)' : 'var(--color-bg-card)',
                    border: `1px solid ${field.value === wt ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: field.value === wt ? '#fff' : 'var(--color-text-secondary)',
                  }}>
                  <span className="text-lg">{WALLET_ICONS[wt]}</span>
                  <span>{t(`wallets.types.${wt}`)}</span>
                </button>
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

        {/* Color */}
        <div>
          <label className="label">Color</label>
          <Controller name="color" control={control} render={({ field }) => (
            <div className="flex gap-2 flex-wrap">
              {WALLET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => field.onChange(c)}
                  className="w-8 h-8 rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: field.value === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }} />
              ))}
            </div>
          )} />
        </div>

        {/* Initial balance */}
        <div>
          <label className="label">{t('wallets.initialBalance')}</label>
          <Controller name="initial_balance" control={control} render={({ field }) => (
            <input
              type="number" inputMode="decimal" step="0.01"
              value={field.value ?? ''}
              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
              className="input text-xl font-bold"
            />
          )} />
        </div>

        {/* Credit limit (credit card only) */}
        {watchedType === 'credit_card' && (
          <div>
            <label className="label">{t('wallets.creditLimit')}</label>
            <Controller name="credit_limit" control={control} render={({ field }) => (
              <input
                type="number" inputMode="decimal" step="0.01"
                value={field.value ?? ''}
                onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                className="input"
              />
            )} />
          </div>
        )}

        {/* Include in net worth */}
        <Controller name="include_in_net_worth" control={control} render={({ field }) => (
          <button type="button" onClick={() => field.onChange(!field.value)}
            className="flex items-center gap-3 text-sm"
            style={{ color: 'var(--color-text-primary)' }}>
            <div className="relative w-11 h-6 rounded-full transition-colors"
              style={{ backgroundColor: field.value ? 'var(--color-accent)' : 'var(--color-border)' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: field.value ? '1.375rem' : '2px' }} />
            </div>
            {t('wallets.includeInNetWorth')}
          </button>
        )} />

        {/* Submit */}
        <button type="submit" disabled={isBusy}
          className="w-full h-12 rounded-2xl font-semibold text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}>
          {isBusy ? '...' : t('common.save')}
        </button>
      </form>
    </Modal>
  )
}

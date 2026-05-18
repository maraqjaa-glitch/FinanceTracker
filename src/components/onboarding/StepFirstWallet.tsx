import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OnboardingState, WalletType, WalletFormValues } from '@/types'
import NextButton from './NextButton'

const WALLET_TYPES: { value: WalletType; icon: string; labelKey: string }[] = [
  { value: 'bank',        icon: '🏦', labelKey: 'wallets.types.bank' },
  { value: 'cash',        icon: '💵', labelKey: 'wallets.types.cash' },
  { value: 'credit_card', icon: '💳', labelKey: 'wallets.types.credit_card' },
  { value: 'savings',     icon: '🐷', labelKey: 'wallets.types.savings' },
]

const DEFAULT_WALLET: WalletFormValues = {
  name: '',
  type: 'bank',
  currency: 'PLN',
  icon: '🏦',
  color: '#6366f1',
  initial_balance: 0,
  include_in_net_worth: true,
}

const TYPE_ICONS: Record<WalletType, string> = {
  bank:        '🏦',
  cash:        '💵',
  credit_card: '💳',
  savings:     '🐷',
  investment:  '📈',
  other:       '👛',
}

interface Props {
  state: OnboardingState
  onUpdate: (patch: Partial<OnboardingState>) => void
  onNext: () => void
}

export default function StepFirstWallet({ state, onUpdate, onNext }: Props) {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(!!state.first_wallet)

  const wallet = state.first_wallet ?? { ...DEFAULT_WALLET, currency: state.preferred_currency }

  const patchWallet = (patch: Partial<WalletFormValues>) => {
    onUpdate({ first_wallet: { ...wallet, ...patch } })
  }

  const handleTypeChange = (type: WalletType) => {
    patchWallet({ type, icon: TYPE_ICONS[type] })
  }

  const handleSkip = () => {
    onUpdate({ first_wallet: undefined })
    onNext()
  }

  const handleEnable = () => {
    setEnabled(true)
    onUpdate({ first_wallet: { ...wallet } })
  }

  if (!enabled) {
    return (
      <div className="flex flex-col items-center gap-6 pt-8 animate-fade-in">
        <span className="text-6xl">👛</span>
        <div className="text-center">
          <h3 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
            {t('wallets.addWallet')}
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('wallets.noWalletsDesc')}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <button
            type="button"
            onClick={handleEnable}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {t('wallets.addWallet')}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm py-2 text-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('common.skip')}
          </button>
        </div>
      </div>
    )
  }

  const isValid = wallet.name.trim().length >= 1

  return (
    <div className="flex flex-col gap-5 pt-4 animate-fade-in">
      {/* Wallet name */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.firstWalletName')} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={wallet.name}
          onChange={e => patchWallet({ name: e.target.value })}
          placeholder="e.g. PKO Bank, Cash Wallet"
          className="w-full h-12 px-4 rounded-2xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          autoFocus
        />
      </div>

      {/* Wallet type */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.firstWalletType')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {WALLET_TYPES.map(({ value, icon, labelKey }) => {
            const active = wallet.type === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTypeChange(value)}
                className="flex items-center gap-2 h-11 px-3 rounded-xl text-sm transition-all"
                style={{
                  backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: active ? '#fff' : 'var(--color-text-primary)',
                }}
              >
                <span>{icon}</span>
                <span className="font-medium">{t(labelKey)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Starting balance */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.firstWalletBalance')}
        </label>
        <div
          className="flex items-center gap-3 h-14 px-4 rounded-2xl"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <span className="font-semibold text-sm" style={{ color: 'var(--color-accent)' }}>
            {wallet.currency}
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={wallet.initial_balance || ''}
            onChange={e => patchWallet({ initial_balance: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="flex-1 text-2xl font-bold bg-transparent outline-none tabular-nums"
            style={{ color: 'var(--color-text-primary)' }}
            min={0}
          />
        </div>
      </div>

      <NextButton onClick={onNext} disabled={!isValid} onSkip={handleSkip} />
    </div>
  )
}

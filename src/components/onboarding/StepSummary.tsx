import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import type { OnboardingState } from '@/types'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'

interface SummaryRow {
  icon: string
  label: string
  value: string
}

interface Props {
  state: OnboardingState
  saving: boolean
  onFinish: () => void
}

export default function StepSummary({ state, saving, onFinish }: Props) {
  const { t } = useTranslation()

  const currency = SUPPORTED_CURRENCIES.find(c => c.code === state.preferred_currency)

  const enabledModules = Object.entries(state.active_modules)
    .filter(([, v]) => v)
    .length

  const rows: SummaryRow[] = [
    { icon: '👤', label: t('onboarding.fullName'), value: state.full_name || '—' },
    {
      icon: state.language === 'pl' ? '🇵🇱' : '🇬🇧',
      label: t('onboarding.language'),
      value: state.language === 'pl' ? 'Polski' : 'English',
    },
    {
      icon: currency?.flag ?? '💰',
      label: t('onboarding.currency'),
      value: state.preferred_currency,
    },
    {
      icon: state.theme === 'dark' ? '🌙' : state.theme === 'light' ? '☀️' : '💻',
      label: t('onboarding.theme'),
      value: t(`onboarding.theme${state.theme.charAt(0).toUpperCase() + state.theme.slice(1)}`),
    },
    {
      icon: '🏠',
      label: t('onboarding.householdMode'),
      value:
        state.household_mode === 'create'
          ? state.household_name || `${state.full_name}'s Household`
          : state.household_mode === 'join'
            ? t('onboarding.joinHousehold')
            : t('onboarding.soloHousehold'),
    },
    {
      icon: '🧩',
      label: t('onboarding.modules'),
      value: `${enabledModules} / 5 enabled`,
    },
  ]

  if (state.monthly_income) {
    rows.push({
      icon: '💸',
      label: t('onboarding.monthlyIncome'),
      value: `${state.preferred_currency} ${state.monthly_income.toLocaleString()}`,
    })
  }

  if (state.first_wallet) {
    rows.push({
      icon: state.first_wallet.icon,
      label: t('wallets.title'),
      value: `${state.first_wallet.name} (${state.first_wallet.currency})`,
    })
  }

  return (
    <div className="flex flex-col gap-5 pt-4 animate-fade-in">
      {/* Hero */}
      <div className="text-center py-4">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
          style={{ backgroundColor: `${state.accent_color}20`, border: `2px solid ${state.accent_color}` }}
        >
          🎉
        </div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {t('onboarding.summaryTitle')}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.summaryDesc')}
        </p>
      </div>

      {/* Summary card */}
      <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg w-7 text-center">{row.icon}</span>
            <span className="text-sm flex-1" style={{ color: 'var(--color-text-secondary)' }}>
              {row.label}
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Accent preview chip */}
      <div className="flex items-center gap-2 justify-center">
        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: state.accent_color }} />
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {state.accent_color}
        </span>
      </div>

      {/* Finish button */}
      <button
        type="button"
        onClick={onFinish}
        disabled={saving}
        className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-bold text-base text-white transition-opacity disabled:opacity-60 mt-2"
        style={{ backgroundColor: state.accent_color }}
      >
        {saving ? (
          <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <>
            {t('onboarding.goToDashboard')}
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  )
}

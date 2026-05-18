import { useTranslation } from 'react-i18next'
import type { OnboardingState } from '@/types'
import NextButton from './NextButton'

interface Props {
  state: OnboardingState
  onUpdate: (patch: Partial<OnboardingState>) => void
  onNext: () => void
}

export default function StepIncome({ state, onUpdate, onNext }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6 pt-4 animate-fade-in">
      <div className="text-center py-4">
        <span className="text-5xl">💸</span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.monthlyIncome')}
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('onboarding.monthlyIncomeHint')}
        </p>

        {/* Large amount input */}
        <div className="flex items-center gap-3 h-16 px-5 rounded-2xl"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <span className="text-xl font-semibold" style={{ color: 'var(--color-accent)' }}>
            {state.preferred_currency}
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={state.monthly_income ?? ''}
            onChange={e => {
              const val = parseFloat(e.target.value)
              onUpdate({ monthly_income: isNaN(val) ? undefined : val })
            }}
            placeholder={t('onboarding.monthlyIncomePlaceholder')}
            className="flex-1 text-3xl font-bold bg-transparent outline-none tabular-nums"
            style={{ color: 'var(--color-text-primary)' }}
            min={0}
          />
        </div>
      </div>

      <NextButton
        onClick={onNext}
        onSkip={onNext}
        skipLabel={t('common.skip')}
      />
    </div>
  )
}

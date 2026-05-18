import { useTranslation } from 'react-i18next'
import type { OnboardingState, ActiveModules } from '@/types'
import NextButton from './NextButton'

type ModuleKey = keyof ActiveModules

interface ModuleDef {
  key: ModuleKey
  icon: string
  nameKey: string
  descKey: string
}

const MODULES: ModuleDef[] = [
  { key: 'budget',            icon: '📊', nameKey: 'modules.budget.name',            descKey: 'modules.budget.description' },
  { key: 'savings_envelopes', icon: '💰', nameKey: 'modules.savings_envelopes.name', descKey: 'modules.savings_envelopes.description' },
  { key: 'budget_envelopes',  icon: '📋', nameKey: 'modules.budget_envelopes.name',  descKey: 'modules.budget_envelopes.description' },
  { key: 'investments',       icon: '📈', nameKey: 'modules.investments.name',       descKey: 'modules.investments.description' },
  { key: 'portfolios',        icon: '🗂️', nameKey: 'modules.portfolios.name',        descKey: 'modules.portfolios.description' },
]

interface Props {
  state: OnboardingState
  onUpdate: (patch: Partial<OnboardingState>) => void
  onNext: () => void
}

export default function StepModules({ state, onUpdate, onNext }: Props) {
  const { t } = useTranslation()

  const toggle = (key: ModuleKey) => {
    onUpdate({
      active_modules: {
        ...state.active_modules,
        [key]: !state.active_modules[key],
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 pt-4 animate-fade-in">
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {t('onboarding.modules')} — {t('common.optional')}
      </p>

      {MODULES.map(({ key, icon, nameKey, descKey }) => {
        const enabled = state.active_modules[key]
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
            style={{
              backgroundColor: enabled ? `${state.accent_color}15` : 'var(--color-bg-elevated)',
              border: `1.5px solid ${enabled ? state.accent_color : 'var(--color-border)'}`,
            }}
          >
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {t(nameKey)}
              </p>
              <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--color-text-muted)' }}>
                {t(descKey)}
              </p>
            </div>

            {/* Toggle pill */}
            <div
              className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
              style={{ backgroundColor: enabled ? state.accent_color : 'var(--color-border)' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: enabled ? '1.375rem' : '2px' }}
              />
            </div>
          </button>
        )
      })}

      <NextButton onClick={onNext} />
    </div>
  )
}

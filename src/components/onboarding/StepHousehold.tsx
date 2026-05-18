import { useTranslation } from 'react-i18next'
import type { OnboardingState } from '@/types'
import NextButton from './NextButton'

interface ModeOption {
  value: OnboardingState['household_mode']
  icon: string
  title: string
  desc: string
}

interface Props {
  state: OnboardingState
  onUpdate: (patch: Partial<OnboardingState>) => void
  onNext: () => void
}

export default function StepHousehold({ state, onUpdate, onNext }: Props) {
  const { t } = useTranslation()

  const MODE_OPTIONS: ModeOption[] = [
    {
      value: 'create',
      icon: '🏠',
      title: t('onboarding.createHousehold'),
      desc: t('onboarding.householdMode'),
    },
    {
      value: 'join',
      icon: '🔗',
      title: t('onboarding.joinHousehold'),
      desc: t('onboarding.invitationToken'),
    },
    {
      value: 'solo',
      icon: '👤',
      title: t('onboarding.soloHousehold'),
      desc: t('onboarding.householdMode'),
    },
  ]

  const isValid =
    state.household_mode === 'create'
      ? true // name is optional (auto-generated from full_name)
      : state.household_mode === 'join'
        ? state.invitation_token.trim().length >= 10
        : true // solo always valid

  return (
    <div className="flex flex-col gap-4 pt-4 animate-fade-in">
      {/* Mode selector */}
      <div className="flex flex-col gap-3">
        {MODE_OPTIONS.map(opt => {
          const active = state.household_mode === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate({ household_mode: opt.value })}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{
                backgroundColor: active ? `${state.accent_color}18` : 'var(--color-bg-elevated)',
                border: `2px solid ${active ? state.accent_color : 'var(--color-border)'}`,
              }}
            >
              <span className="text-2xl">{opt.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {opt.title}
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: active ? state.accent_color : 'var(--color-border)',
                  backgroundColor: active ? state.accent_color : 'transparent',
                }}
              >
                {active && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Conditional fields */}
      {state.household_mode === 'create' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {t('onboarding.householdName')}
          </label>
          <input
            type="text"
            value={state.household_name}
            onChange={e => onUpdate({ household_name: e.target.value })}
            placeholder={t('onboarding.householdNamePlaceholder')}
            className="w-full h-12 px-4 rounded-2xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      )}

      {state.household_mode === 'join' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {t('onboarding.invitationToken')}
          </label>
          <input
            type="text"
            value={state.invitation_token}
            onChange={e => onUpdate({ invitation_token: e.target.value })}
            placeholder="Paste your invitation token…"
            className="w-full h-12 px-4 rounded-2xl text-sm outline-none font-mono"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      )}

      {state.household_mode === 'solo' && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            {t('onboarding.householdName')}
          </label>
          <input
            type="text"
            value={state.household_name}
            onChange={e => onUpdate({ household_name: e.target.value })}
            placeholder={`${state.full_name || 'My'} Household`}
            className="w-full h-12 px-4 rounded-2xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
      )}

      <NextButton onClick={onNext} disabled={!isValid} />
    </div>
  )
}

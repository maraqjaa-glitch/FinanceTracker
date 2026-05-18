import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import { supabase } from '@/lib/supabase'
import type { OnboardingState, ActiveModules, WalletFormValues } from '@/types'
import i18n from '@/i18n'

import StepPersonalInfo from './StepPersonalInfo'
import StepPreferences from './StepPreferences'
import StepHousehold from './StepHousehold'
import StepModules from './StepModules'
import StepIncome from './StepIncome'
import StepFirstWallet from './StepFirstWallet'
import StepSummary from './StepSummary'

// ─── Constants ───────────────────────────────
const TOTAL_STEPS = 7

const DEFAULT_STATE: OnboardingState = {
  step: 1,
  full_name: '',
  avatar_url: '',
  language: 'pl',
  preferred_currency: 'PLN',
  theme: 'dark',
  accent_color: '#6366f1',
  household_mode: 'solo',
  household_name: '',
  invitation_token: '',
  active_modules: {
    budget: true,
    savings_envelopes: true,
    budget_envelopes: true,
    investments: true,
    portfolios: true,
  },
  monthly_income: undefined,
  first_wallet: undefined,
}

// ─── Progress bar ────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step - 1) / (total - 1)) * 100)
  return (
    <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }}
      />
    </div>
  )
}

// ─── Main Wizard ─────────────────────────────
export default function OnboardingWizard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, profile, updateProfile } = useAuthStore()
  const { createHousehold, joinHousehold } = useHouseholdStore()
  const { setTheme, setAccentColor, setLanguage } = useUIStore()

  // Pre-fill from OAuth profile if available
  const [state, setState] = useState<OnboardingState>({
    ...DEFAULT_STATE,
    full_name: profile?.full_name ?? '',
    avatar_url: profile?.avatar_url ?? '',
    language: profile?.language ?? 'pl',
    preferred_currency: profile?.preferred_currency ?? 'PLN',
    theme: profile?.theme ?? 'dark',
    accent_color: profile?.accent_color ?? '#6366f1',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const goNext = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.min(prev.step + 1, TOTAL_STEPS) }))
  }, [])

  const goBack = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }))
  }, [])

  // Real-time theme/language preview
  const previewTheme = useCallback((theme: OnboardingState['theme'], accent: string) => {
    setTheme(theme)
    setAccentColor(accent)
  }, [setTheme, setAccentColor])

  const previewLanguage = useCallback((lang: OnboardingState['language']) => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }, [setLanguage])

  // ── Finish handler ────────────────────────
  const handleFinish = useCallback(async () => {
    if (!session?.user) return
    setSaving(true)
    setError(null)

    try {
      const userId = session.user.id

      // 1. Create / join household
      if (state.household_mode === 'create') {
        const name = state.household_name.trim() || `${state.full_name}'s Household`
        await createHousehold(name, userId)
      } else if (state.household_mode === 'join' && state.invitation_token.trim()) {
        await joinHousehold(state.invitation_token.trim(), userId)
      } else {
        // solo — create personal household
        const name = state.household_name.trim() || `${state.full_name || 'My'} Household`
        await createHousehold(name, userId)
      }

      // 2. Create first wallet if provided
      const { activeHousehold } = useHouseholdStore.getState()
      if (state.first_wallet && activeHousehold) {
        await supabase.from('wallets').insert({
          household_id: activeHousehold.id,
          name: state.first_wallet.name,
          type: state.first_wallet.type,
          currency: state.first_wallet.currency,
          icon: state.first_wallet.icon,
          color: state.first_wallet.color,
          initial_balance: state.first_wallet.initial_balance,
          credit_limit: state.first_wallet.credit_limit ?? null,
          include_in_net_worth: state.first_wallet.include_in_net_worth,
        })
      }

      // 3. Update profile
      await updateProfile({
        full_name: state.full_name,
        avatar_url: state.avatar_url || null,
        preferred_currency: state.preferred_currency,
        language: state.language,
        theme: state.theme,
        accent_color: state.accent_color,
        monthly_income: state.monthly_income ?? null,
        active_modules: state.active_modules,
        onboarding_completed: true,
      })

      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Onboarding finish error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }, [state, session, createHousehold, joinHousehold, updateProfile, navigate])

  // ── Step label key map ────────────────────
  const STEP_LABELS: Record<number, string> = {
    1: t('onboarding.steps.personalInfo'),
    2: t('onboarding.steps.preferences'),
    3: t('onboarding.steps.household'),
    4: t('onboarding.steps.modules'),
    5: t('onboarding.steps.income'),
    6: t('onboarding.steps.firstWallet'),
    7: t('onboarding.steps.summary'),
  }

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 pt-safe px-4 pb-3" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto h-14">
          {state.step > 1 ? (
            <button
              onClick={goBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label={t('common.back')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}

          <div className="flex-1">
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('onboarding.step', { current: state.step, total: TOTAL_STEPS })}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {STEP_LABELS[state.step]}
            </p>
          </div>

          {/* Logo badge */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            🏰
          </div>
        </div>

        <div className="max-w-lg mx-auto">
          <ProgressBar step={state.step} total={TOTAL_STEPS} />
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 max-w-lg mx-auto w-full">
        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-red-400" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        {state.step === 1 && (
          <StepPersonalInfo
            state={state}
            onUpdate={update}
            onNext={goNext}
            onPreviewLanguage={previewLanguage}
          />
        )}
        {state.step === 2 && (
          <StepPreferences
            state={state}
            onUpdate={update}
            onNext={goNext}
            onPreviewTheme={previewTheme}
          />
        )}
        {state.step === 3 && (
          <StepHousehold
            state={state}
            onUpdate={update}
            onNext={goNext}
          />
        )}
        {state.step === 4 && (
          <StepModules
            state={state}
            onUpdate={update}
            onNext={goNext}
          />
        )}
        {state.step === 5 && (
          <StepIncome
            state={state}
            onUpdate={update}
            onNext={goNext}
          />
        )}
        {state.step === 6 && (
          <StepFirstWallet
            state={state}
            onUpdate={update}
            onNext={goNext}
          />
        )}
        {state.step === 7 && (
          <StepSummary
            state={state}
            saving={saving}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}

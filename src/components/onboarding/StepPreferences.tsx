import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { OnboardingState } from '@/types'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import NextButton from './NextButton'

// ─── Accent colour palette ───────────────────
const ACCENT_COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#14b8a6', name: 'Teal' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#ec4899', name: 'Pink' },
]

interface Props {
  state: OnboardingState
  onUpdate: (patch: Partial<OnboardingState>) => void
  onNext: () => void
  onPreviewTheme: (theme: OnboardingState['theme'], accent: string) => void
}

export default function StepPreferences({ state, onUpdate, onNext, onPreviewTheme }: Props) {
  const { t } = useTranslation()

  const handleTheme = (theme: OnboardingState['theme']) => {
    onUpdate({ theme })
    onPreviewTheme(theme, state.accent_color)
  }

  const handleAccent = (hex: string) => {
    onUpdate({ accent_color: hex })
    onPreviewTheme(state.theme, hex)
  }

  const THEMES: { value: OnboardingState['theme']; label: string; icon: string }[] = [
    { value: 'dark', label: t('onboarding.themeDark'), icon: '🌙' },
    { value: 'light', label: t('onboarding.themeLight'), icon: '☀️' },
    { value: 'system', label: t('onboarding.themeSystem'), icon: '💻' },
  ]

  return (
    <div className="flex flex-col gap-6 pt-4 animate-fade-in">
      {/* Currency */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.currency')}
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
          {SUPPORTED_CURRENCIES.filter(c => c.code !== 'BTC').map(currency => (
            <button
              key={currency.code}
              type="button"
              onClick={() => onUpdate({ preferred_currency: currency.code })}
              className="flex items-center gap-2 h-11 px-3 rounded-xl text-sm transition-all text-left"
              style={{
                backgroundColor: state.preferred_currency === currency.code
                  ? 'var(--color-accent)'
                  : 'var(--color-bg-elevated)',
                border: `1px solid ${state.preferred_currency === currency.code ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: state.preferred_currency === currency.code ? '#fff' : 'var(--color-text-primary)',
              }}
            >
              <span className="text-base flex-shrink-0">{currency.flag}</span>
              <span className="font-medium">{currency.code}</span>
              <span className="text-xs truncate opacity-70">{currency.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.theme')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ value, label, icon }) => {
            const active = state.theme === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleTheme(value)}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-medium transition-all relative"
                style={{
                  backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  color: active ? '#fff' : 'var(--color-text-primary)',
                }}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5">
                    <Check className="w-3 h-3" />
                  </span>
                )}
                <span className="text-2xl">{icon}</span>
                <span className="text-xs">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accent colour */}
      <div>
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.accentColor')}
        </label>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map(({ hex, name }) => (
            <button
              key={hex}
              type="button"
              onClick={() => handleAccent(hex)}
              className="w-9 h-9 rounded-full transition-transform active:scale-90 flex items-center justify-center"
              style={{
                backgroundColor: hex,
                outline: state.accent_color === hex ? `2px solid ${hex}` : 'none',
                outlineOffset: '3px',
              }}
              aria-label={name}
            >
              {state.accent_color === hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>

      <NextButton onClick={onNext} />
    </div>
  )
}

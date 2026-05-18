import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'
import type { OnboardingState } from '@/types'
import NextButton from './NextButton'

// ─── Avatar colour palette ───────────────────
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#0ea5e9',
  '#14b8a6', '#84cc16',
]

// ─── Initials avatar renderer ────────────────
function InitialsAvatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white select-none"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

interface Props {
  state: OnboardingState
  onUpdate: (patch: Partial<OnboardingState>) => void
  onNext: () => void
  onPreviewLanguage: (lang: OnboardingState['language']) => void
}

export default function StepPersonalInfo({ state, onUpdate, onNext, onPreviewLanguage }: Props) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  // Pick avatar colour from name (consistent hash)
  const autoColor = AVATAR_COLORS[
    (state.full_name.charCodeAt(0) || 0) % AVATAR_COLORS.length
  ]
  const avatarColor = state.accent_color || autoColor

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onUpdate({ avatar_url: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  const handleLanguage = (lang: OnboardingState['language']) => {
    onUpdate({ language: lang })
    onPreviewLanguage(lang)
  }

  const isValid = state.full_name.trim().length >= 2

  return (
    <div className="flex flex-col gap-6 pt-4 animate-fade-in">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {state.avatar_url ? (
            <img
              src={state.avatar_url}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <InitialsAvatar name={state.full_name} color={avatarColor} />
          )}

          {/* Upload overlay */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white shadow"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-label={t('onboarding.avatarUpload')}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Colour dots for initials avatar */}
        {!state.avatar_url && (
          <div className="flex gap-2">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdate({ accent_color: c })}
                className="w-6 h-6 rounded-full transition-transform active:scale-90"
                style={{
                  backgroundColor: c,
                  outline: state.accent_color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
                aria-label={c}
              />
            ))}
          </div>
        )}

        {state.avatar_url && (
          <button
            type="button"
            onClick={() => onUpdate({ avatar_url: '' })}
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('onboarding.avatarGenerate')}
          </button>
        )}
      </div>

      {/* Full name */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.fullName')} <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={state.full_name}
          onChange={e => onUpdate({ full_name: e.target.value })}
          placeholder={t('onboarding.fullNamePlaceholder')}
          className="w-full h-12 px-4 rounded-2xl text-base outline-none"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          autoComplete="name"
          autoFocus
        />
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.language')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['pl', 'en'] as const).map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguage(lang)}
              className="flex items-center gap-3 h-12 px-4 rounded-2xl text-sm font-medium transition-all"
              style={{
                backgroundColor: state.language === lang ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                border: `1px solid ${state.language === lang ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: state.language === lang ? '#fff' : 'var(--color-text-primary)',
              }}
            >
              <span className="text-xl">{lang === 'pl' ? '🇵🇱' : '🇬🇧'}</span>
              {lang === 'pl' ? 'Polski' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <NextButton onClick={onNext} disabled={!isValid} />
    </div>
  )
}

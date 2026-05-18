import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TopHeader from '@/components/layout/TopHeader'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import i18n from '@/i18n'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'
import type { Theme, Language } from '@/types'

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

const schema = z.object({
  full_name:          z.string().min(1, 'Name is required'),
  preferred_currency: z.string().min(1),
  language:           z.enum(['pl', 'en']),
  theme:              z.enum(['dark', 'light', 'system']),
  accent_color:       z.string().min(1),
  monthly_income:     z.number().positive().optional(),
})
type FormValues = z.infer<typeof schema>

export default function ProfilePage() {
  const { t } = useTranslation()
  const { profile, updateProfile } = useAuthStore()
  const { setTheme, setAccentColor, setLanguage, applyThemeToDOM } = useUIStore()
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        full_name:          profile?.full_name ?? '',
        preferred_currency: profile?.preferred_currency ?? 'PLN',
        language:           (profile?.language ?? 'pl') as Language,
        theme:              (profile?.theme ?? 'dark') as Theme,
        accent_color:       profile?.accent_color ?? '#6366f1',
        monthly_income:     profile?.monthly_income ?? undefined,
      },
    })

  const watchedTheme  = watch('theme')
  const watchedAccent = watch('accent_color')
  const watchedLang   = watch('language')

  // Live preview on change
  const handleThemeChange = (v: Theme) => {
    setValue('theme', v)
    setTheme(v)
    applyThemeToDOM(v, watchedAccent)
  }
  const handleAccentChange = (hex: string) => {
    setValue('accent_color', hex)
    setAccentColor(hex)
    applyThemeToDOM(watchedTheme, hex)
  }
  const handleLangChange = (l: Language) => {
    setValue('language', l)
    setLanguage(l)
    i18n.changeLanguage(l)
  }

  const onSubmit = async (values: FormValues) => {
    await updateProfile({
      full_name:          values.full_name,
      preferred_currency: values.preferred_currency,
      language:           values.language,
      theme:              values.theme,
      accent_color:       values.accent_color,
      monthly_income:     values.monthly_income ?? null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = (profile?.full_name ?? profile?.email ?? '?')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <TopHeader title={t('settings.profile')} showBack />

      <div className="px-4 py-4">
        {/* Avatar hero */}
        <div className="flex flex-col items-center mb-6 gap-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
            style={{ backgroundColor: watchedAccent }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
              : initials
            }
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {profile?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

          {/* Full name */}
          <div>
            <label className="label">{t('onboarding.fullName')}</label>
            <input {...register('full_name')} className="input" placeholder="Your name" />
            {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
          </div>

          {/* Language */}
          <div>
            <label className="label">{t('settings.language')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['pl', 'en'] as Language[]).map(lang => (
                <button key={lang} type="button" onClick={() => handleLangChange(lang)}
                  className="flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: watchedLang === lang ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    border: `1px solid ${watchedLang === lang ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: watchedLang === lang ? '#fff' : 'var(--color-text-primary)',
                  }}>
                  <span>{lang === 'pl' ? '🇵🇱' : '🇬🇧'}</span>
                  {lang === 'pl' ? 'Polski' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Base currency */}
          <div>
            <label className="label">{t('settings.currency')}</label>
            <Controller name="preferred_currency" control={control} render={({ field }) => (
              <select {...field} className="input">
                {SUPPORTED_CURRENCIES.filter(c => c.code !== 'BTC').map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                ))}
              </select>
            )} />
          </div>

          {/* Theme */}
          <div>
            <label className="label">{t('settings.theme')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['dark', 'light', 'system'] as Theme[]).map(th => {
                const icons: Record<Theme, string> = { dark: '🌙', light: '☀️', system: '💻' }
                const labels: Record<Theme, string> = { dark: t('onboarding.themeDark'), light: t('onboarding.themeLight'), system: t('onboarding.themeSystem') }
                return (
                  <button key={th} type="button" onClick={() => handleThemeChange(th)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: watchedTheme === th ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                      border: `1px solid ${watchedTheme === th ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      color: watchedTheme === th ? '#fff' : 'var(--color-text-primary)',
                    }}>
                    <span className="text-xl">{icons[th]}</span>
                    {labels[th]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Accent colour */}
          <div>
            <label className="label">{t('settings.accentColor')}</label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(({ hex, name }) => (
                <button key={hex} type="button" onClick={() => handleAccentChange(hex)}
                  className="w-9 h-9 rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: hex,
                    outline: watchedAccent === hex ? `2px solid ${hex}` : 'none',
                    outlineOffset: '3px',
                  }} aria-label={name} />
              ))}
            </div>
          </div>

          {/* Monthly income */}
          <div>
            <label className="label">
              {t('settings.monthlyIncome')}{' '}
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({t('common.optional')})</span>
            </label>
            <Controller name="monthly_income" control={control} render={({ field }) => (
              <input
                type="number" inputMode="decimal" step="0.01" min="0"
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="input"
                placeholder="e.g. 5000"
              />
            )} />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Used to calculate savings rate on the dashboard.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: saved ? '#10b981' : 'var(--color-accent)' }}
          >
            {isSubmitting ? '...' : saved ? '✓ Saved!' : t('common.save')}
          </button>
        </form>
      </div>
    </div>
  )
}

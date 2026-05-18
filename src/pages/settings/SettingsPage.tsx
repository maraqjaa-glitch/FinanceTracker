import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  User, Home, Tag, DollarSign, Upload, RefreshCw, LogOut, ChevronRight,
} from 'lucide-react'
import TopHeader from '@/components/layout/TopHeader'
import { useAuthStore } from '@/store/authStore'
import { useHouseholdStore } from '@/store/householdStore'

interface SettingItem {
  icon: React.ReactNode
  label: string
  description?: string
  path: string
  color?: string
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuthStore()
  const { activeHousehold } = useHouseholdStore()

  const ITEMS: SettingItem[] = [
    {
      icon: <User className="w-5 h-5" />,
      label: t('settings.profile'),
      description: profile?.full_name ?? profile?.email ?? '',
      path: '/settings/profile',
      color: '#6366f1',
    },
    {
      icon: <Home className="w-5 h-5" />,
      label: t('settings.household'),
      description: activeHousehold?.name ?? '',
      path: '/settings/household',
      color: '#10b981',
    },
    {
      icon: <Tag className="w-5 h-5" />,
      label: t('settings.categories'),
      description: 'Manage transaction categories',
      path: '/settings/categories',
      color: '#f59e0b',
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: t('settings.currencies'),
      description: 'Exchange rates & base currency',
      path: '/settings/currencies',
      color: '#0ea5e9',
    },
    {
      icon: <Upload className="w-5 h-5" />,
      label: t('settings.import'),
      description: 'Import transactions from CSV',
      path: '/settings/import',
      color: '#8b5cf6',
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      label: t('settings.recurring'),
      description: 'Manage recurring transactions',
      path: '/settings/recurring',
      color: '#f97316',
    },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login', { replace: true })
  }

  return (
    <div>
      <TopHeader title={t('settings.title')} />

      {/* Profile hero */}
      <div className="px-4 py-4">
        <div className="card p-4 flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            ) : (
              (profile?.full_name ?? profile?.email ?? '?')
                .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {profile?.full_name ?? 'Your account'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
              {profile?.email}
            </p>
          </div>
        </div>

        {/* Settings list */}
        <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {ITEMS.map(item => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 px-4 py-3.5 w-full text-left"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${item.color ?? '#6b7280'}20`, color: item.color ?? '#6b7280' }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {item.description}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full mt-4 h-11 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <LogOut className="w-4 h-4" />
          {t('auth.logout')}
        </button>
      </div>
    </div>
  )
}

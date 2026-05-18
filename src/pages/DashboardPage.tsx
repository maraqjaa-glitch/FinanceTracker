import { useTranslation } from 'react-i18next'
import TopHeader from '@/components/layout/TopHeader'
import { useAuthStore } from '@/store/authStore'
import { useHouseholdStore } from '@/store/householdStore'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const { activeHousehold } = useHouseholdStore()

  return (
    <div>
      <TopHeader title={activeHousehold?.name ?? t('dashboard.title')} showSettings />

      <div className="px-4 py-6 flex flex-col gap-4">
        {/* Welcome card */}
        <div className="card p-5">
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {t('dashboard.monthlyOverview')}
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            👋 {profile?.full_name?.split(' ')[0] ?? 'Welcome'}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Phase 1 complete — full dashboard coming in Phase 6.
          </p>
        </div>

        {/* Placeholder cards */}
        {[
          t('dashboard.netWorth'),
          t('dashboard.wallets'),
          t('dashboard.recentTransactions'),
        ].map((label) => (
          <div key={label} className="card p-5">
            <div className="skeleton h-4 w-32 mb-3" />
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

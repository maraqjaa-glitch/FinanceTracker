import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, Target, BarChart2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/store/uiStore'

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/transactions',  icon: ArrowLeftRight,  labelKey: 'nav.transactions' },
  { to: null,             icon: null,            labelKey: null }, // FAB slot
  { to: '/envelopes',     icon: Target,          labelKey: 'nav.envelopes' },
  { to: '/analytics',     icon: BarChart2,       labelKey: 'nav.analytics' },
]

export default function BottomNav() {
  const { t } = useTranslation()
  const { openAddTransaction } = useUIStore()
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass pb-safe"
      style={{ height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {NAV_ITEMS.map((item, index) => {
          // FAB slot (center)
          if (item.to === null) {
            return (
              <button
                key="fab"
                onClick={openAddTransaction}
                aria-label={t('transactions.addTransaction')}
                className="relative -top-5 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform active:scale-95"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
              </button>
            )
          }

          const Icon = item.icon!
          const isActive = location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-1 group"
              aria-label={t(item.labelKey!)}
            >
              <Icon
                className="w-5 h-5 transition-colors"
                style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className="text-[10px] font-medium transition-colors leading-none"
                style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
              >
                {t(item.labelKey!)}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

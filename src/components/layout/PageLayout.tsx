import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

// Settings sub-pages don't show bottom nav
const NO_BOTTOM_NAV = ['/settings/profile', '/settings/household', '/settings/categories',
  '/settings/currencies', '/settings/import', '/settings/recurring']

export default function PageLayout() {
  const { pathname } = useLocation()
  const hideNav = NO_BOTTOM_NAV.some((p) => pathname.startsWith(p))

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Page content — padded above bottom nav */}
      <main
        className="flex-1 w-full max-w-lg mx-auto page-enter"
        style={{ paddingBottom: hideNav ? 0 : 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 8px)' }}
      >
        <Outlet />
      </main>

      {!hideNav && <BottomNav />}
    </div>
  )
}

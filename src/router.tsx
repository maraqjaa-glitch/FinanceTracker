import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import PageLayout from '@/components/layout/PageLayout'

// ─── Lazy-loaded pages ───────────────────────
const LoginPage       = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage    = lazy(() => import('@/pages/auth/RegisterPage'))
const CallbackPage    = lazy(() => import('@/pages/auth/CallbackPage'))
const OnboardingPage  = lazy(() => import('@/pages/OnboardingPage'))
const DashboardPage   = lazy(() => import('@/pages/DashboardPage'))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
const EnvelopesPage   = lazy(() => import('@/pages/EnvelopesPage'))
const AnalyticsPage   = lazy(() => import('@/pages/AnalyticsPage'))
const PortfoliosPage  = lazy(() => import('@/pages/PortfoliosPage'))
const WalletsPage       = lazy(() => import('@/pages/WalletsPage'))
const WalletDetailPage  = lazy(() => import('@/pages/WalletDetailPage'))
const SettingsPage    = lazy(() => import('@/pages/settings/SettingsPage'))
const ProfilePage     = lazy(() => import('@/pages/settings/ProfilePage'))
const HouseholdPage   = lazy(() => import('@/pages/settings/HouseholdPage'))
const CategoriesPage  = lazy(() => import('@/pages/settings/CategoriesPage'))
const ImportPage      = lazy(() => import('@/pages/settings/ImportPage'))
const RecurringPage   = lazy(() => import('@/pages/settings/RecurringPage'))
const CurrenciesPage  = lazy(() => import('@/pages/settings/CurrenciesPage'))

// ─── Spinner fallback while lazy chunks load ─
function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-primary)]">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)] animate-spin" />
    </div>
  )
}

// ─── Protected route: requires authenticated session ─
function RequireAuth() {
  const { session, loading } = useAuthStore()

  if (loading) return <PageSpinner />
  if (!session) return <Navigate to="/auth/login" replace />

  return <Outlet />
}

// ─── Onboarding gate: redirect if not completed ─
function RequireOnboarding() {
  const { profile, loading } = useAuthStore()

  if (loading) return <PageSpinner />
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

// ─── Public-only route: redirect authenticated users away from auth pages ─
function PublicOnly() {
  const { session, loading } = useAuthStore()

  if (loading) return <PageSpinner />
  if (session) return <Navigate to="/" replace />

  return <Outlet />
}

// ─── 404 Page ────────────────────────────────
function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center bg-[var(--color-bg-primary)]">
      <span className="text-6xl">🔍</span>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Page not found</h1>
      <p className="text-[var(--color-text-secondary)]">
        The page you're looking for doesn't exist.
      </p>
      <a
        href="/"
        className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white font-medium text-sm"
      >
        Go home
      </a>
    </div>
  )
}

// ─── Router definition ───────────────────────
export const router = createBrowserRouter([
  // ── Public auth routes (redirect away if already logged in)
  {
    element: (
      <Suspense fallback={<PageSpinner />}>
        <PublicOnly />
      </Suspense>
    ),
    children: [
      { path: '/auth/login',    element: <LoginPage /> },
      { path: '/auth/register', element: <RegisterPage /> },
    ],
  },

  // ── OAuth callback (always accessible)
  {
    path: '/auth/callback',
    element: (
      <Suspense fallback={<PageSpinner />}>
        <CallbackPage />
      </Suspense>
    ),
  },

  // ── Protected routes
  {
    element: (
      <Suspense fallback={<PageSpinner />}>
        <RequireAuth />
      </Suspense>
    ),
    children: [
      // Onboarding (no bottom nav)
      {
        path: '/onboarding',
        element: <OnboardingPage />,
      },

      // Main app (with bottom nav + onboarding gate)
      {
        element: <RequireOnboarding />,
        children: [
          {
            element: <PageLayout />,
            children: [
              { index: true,              element: <Navigate to="/dashboard" replace /> },
              { path: '/dashboard',       element: <DashboardPage /> },
              { path: '/transactions',    element: <TransactionsPage /> },
              { path: '/envelopes',       element: <EnvelopesPage /> },
              { path: '/analytics',       element: <AnalyticsPage /> },
              { path: '/portfolios',      element: <PortfoliosPage /> },
              { path: '/wallets',           element: <WalletsPage /> },
              { path: '/wallets/:id',       element: <WalletDetailPage /> },

              // Settings hub
              { path: '/settings',           element: <SettingsPage /> },
              { path: '/settings/profile',   element: <ProfilePage /> },
              { path: '/settings/household', element: <HouseholdPage /> },
              { path: '/settings/categories',element: <CategoriesPage /> },
              { path: '/settings/currencies',element: <CurrenciesPage /> },
              { path: '/settings/import',    element: <ImportPage /> },
              { path: '/settings/recurring', element: <RecurringPage /> },
            ],
          },
        ],
      },
    ],
  },

  // ── 404
  { path: '*', element: <NotFoundPage /> },
])

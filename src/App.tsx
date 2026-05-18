import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/authStore'
import { useUIStore } from './store/uiStore'
import ToastContainer from './components/ui/Toast'
import { isSupabaseConfigured } from './lib/supabase'
import i18n from './i18n'
import { lazy, Suspense } from 'react'
const TransactionFormModal = lazy(() => import('./components/transactions/TransactionFormModal'))

function SetupScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: 'var(--color-accent)' }}>
        <span className="text-4xl">🏰</span>
      </div>
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        FinFort 2.0
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        Supabase not configured yet
      </p>

      <div className="w-full max-w-sm text-left card p-5 mb-6">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Setup steps:
        </p>
        {[
          '1. Create a project at app.supabase.com',
          '2. Copy .env.example → .env.local',
          '3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
          '4. Run migrations in supabase/migrations/',
          '5. Restart the dev server',
        ].map((step) => (
          <p key={step} className="text-sm py-1.5 border-b last:border-0"
            style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
            {step}
          </p>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        See README.md for full instructions
      </p>
    </div>
  )
}

export default function App() {
  const { initialize } = useAuthStore()
  const { theme, accentColor, language, applyThemeToDOM, isAddTransactionOpen, closeAddTransaction, editTransactionId, closeEditTransaction } = useUIStore()

  useEffect(() => {
    applyThemeToDOM(theme, accentColor)
    i18n.changeLanguage(language)

    if (!isSupabaseConfigured) return

    let unsubscribe: (() => void) | undefined
    initialize().then((unsub) => { unsubscribe = unsub })
    return () => { unsubscribe?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isSupabaseConfigured) {
    return (
      <QueryClientProvider client={queryClient}>
        <SetupScreen />
        <ToastContainer />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer />
      <Suspense fallback={null}>
        <TransactionFormModal
          open={isAddTransactionOpen}
          onClose={closeAddTransaction}
        />
        <TransactionFormModal
          open={!!editTransactionId && !isAddTransactionOpen}
          onClose={closeEditTransaction}
          editId={editTransactionId}
        />
      </Suspense>
    </QueryClientProvider>
  )
}

import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { queryClient } from './lib/queryClient'
import { useAuthStore } from './store/authStore'
import { useUIStore } from './store/uiStore'
import ToastContainer from './components/ui/Toast'
import i18n from './i18n'

export default function App() {
  const { initialize } = useAuthStore()
  const { theme, accentColor, language, applyThemeToDOM } = useUIStore()

  // Boot: init auth listener + apply persisted theme/language
  useEffect(() => {
    // Apply theme immediately from persisted state (avoids flash)
    applyThemeToDOM(theme, accentColor)

    // Sync i18n language
    i18n.changeLanguage(language)

    // Initialize Supabase auth listener (returns unsubscribe fn)
    let unsubscribe: (() => void) | undefined
    initialize().then((unsub) => { unsubscribe = unsub })

    return () => { unsubscribe?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastContainer />
    </QueryClientProvider>
  )
}

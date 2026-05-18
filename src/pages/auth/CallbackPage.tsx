import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/**
 * OAuth callback handler.
 * Supabase exchanges the code for a session automatically when it
 * detects the ?code= param in the URL (detectSessionInUrl: true in client config).
 * We just wait for the session to be established, then redirect.
 */
export default function CallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        navigate('/', { replace: true })
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        subscription.unsubscribe()
        navigate('/', { replace: true })
      }
    })

    // Fallback: if already signed in, redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        navigate('/', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="w-10 h-10 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)] animate-spin" />
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Signing you in…
      </p>
    </div>
  )
}

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import type { Database } from '@/types/database'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null

  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchProfile: (userId: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<() => void>
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    session: null,
    profile: null,
    loading: true,
    error: null,

    setSession: (session) => set({ session }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    fetchProfile: async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (error) throw error
        set({ profile: data as unknown as Profile })
      } catch (err) {
        console.error('Failed to fetch profile:', err)
        set({ error: err instanceof Error ? err.message : 'Failed to load profile' })
      }
    },

    updateProfile: async (updates: Partial<Profile>) => {
      const { session } = get()
      if (!session?.user) return

      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates as Database['public']['Tables']['profiles']['Update'])
          .eq('id', session.user.id)
          .select()
          .single()

        if (error) throw error
        set({ profile: data as unknown as Profile })
      } catch (err) {
        console.error('Failed to update profile:', err)
        throw err
      }
    },

    signOut: async () => {
      try {
        await supabase.auth.signOut()
        set({ session: null, profile: null, error: null })
      } catch (err) {
        console.error('Sign out error:', err)
        throw err
      }
    },

    initialize: async () => {
      set({ loading: true })

      const { data: { session } } = await supabase.auth.getSession()
      set({ session })

      if (session?.user) {
        await get().fetchProfile(session.user.id)
      }

      set({ loading: false })

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          set({ session })

          if (event === 'SIGNED_IN' && session?.user) {
            await get().fetchProfile(session.user.id)
          }

          if (event === 'SIGNED_OUT') {
            set({ profile: null })
          }
        }
      )

      return () => subscription.unsubscribe()
    },
  }))
)

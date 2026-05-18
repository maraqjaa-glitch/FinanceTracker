import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Household, HouseholdMember } from '@/types'
import { supabase } from '@/lib/supabase'

interface HouseholdState {
  activeHousehold: Household | null
  members: HouseholdMember[]
  loading: boolean
  error: string | null

  setActiveHousehold: (household: Household | null) => void
  setMembers: (members: HouseholdMember[]) => void
  fetchHousehold: (userId: string) => Promise<void>
  fetchMembers: (householdId: string) => Promise<void>
  createHousehold: (name: string, userId: string) => Promise<Household>
  joinHousehold: (token: string, userId: string) => Promise<void>
  reset: () => void
}

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set, get) => ({
      activeHousehold: null,
      members: [],
      loading: false,
      error: null,

      setActiveHousehold: (household) => set({ activeHousehold: household }),
      setMembers: (members) => set({ members }),

      fetchHousehold: async (userId: string) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await supabase
            .from('household_members')
            .select('household_id, households(*)')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle()

          if (error) throw error

          if (!data) {
            set({ activeHousehold: null, loading: false })
            return
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const household = (data as any).households as Household
          set({ activeHousehold: household })

          if (household?.id) {
            await get().fetchMembers(household.id)
          }
        } catch (err) {
          console.error('Failed to fetch household:', err)
          set({ error: err instanceof Error ? err.message : 'Failed to load household' })
        } finally {
          set({ loading: false })
        }
      },

      fetchMembers: async (householdId: string) => {
        try {
          const { data, error } = await supabase
            .from('household_members')
            .select('*, profile:profiles(*)')
            .eq('household_id', householdId)

          if (error) throw error
          set({ members: (data ?? []) as unknown as HouseholdMember[] })
        } catch (err) {
          console.error('Failed to fetch members:', err)
        }
      },

      createHousehold: async (name: string, userId: string): Promise<Household> => {
        const { data: household, error: hError } = await supabase
          .from('households')
          .insert({ name, created_by: userId })
          .select()
          .single()

        if (hError || !household) throw hError ?? new Error('Failed to create household')

        const { error: mError } = await supabase
          .from('household_members')
          .insert({
            household_id: household.id,
            user_id: userId,
            role: 'owner',
          })

        if (mError) throw mError

        const h = household as unknown as Household
        set({ activeHousehold: h })
        await get().fetchMembers(h.id)
        return h
      },

      joinHousehold: async (token: string, userId: string): Promise<void> => {
        const { data: invitation, error: iError } = await supabase
          .from('household_invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle()

        if (iError || !invitation) {
          throw new Error('Invalid or expired invitation token')
        }

        const { error: mError } = await supabase
          .from('household_members')
          .insert({
            household_id: invitation.household_id,
            user_id: userId,
            role: 'member',
          })

        if (mError) throw mError

        await supabase
          .from('household_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitation.id)

        await get().fetchHousehold(userId)
      },

      reset: () => set({ activeHousehold: null, members: [], error: null }),
    }),
    {
      name: 'finfort-household',
      partialize: (state) => ({
        activeHousehold: state.activeHousehold,
      }),
    }
  )
)

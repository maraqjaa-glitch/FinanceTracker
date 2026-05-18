// ─────────────────────────────────────────────
// FinFort 2.0 — Supabase Database type definition
// Used by createClient<Database>() for full type safety.
// ─────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Relationships = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          preferred_currency: string
          language: string
          theme: string
          accent_color: string
          monthly_income: number | null
          onboarding_completed: boolean
          active_modules: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferred_currency?: string
          language?: string
          theme?: string
          accent_color?: string
          monthly_income?: number | null
          onboarding_completed?: boolean
          active_modules?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          preferred_currency?: string
          language?: string
          theme?: string
          accent_color?: string
          monthly_income?: number | null
          onboarding_completed?: boolean
          active_modules?: Json
          updated_at?: string
        }
        Relationships: Relationships
      }
      households: {
        Row: {
          id: string
          name: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          created_by?: string | null
        }
        Relationships: Relationships
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          role?: string
        }
        Relationships: Relationships
      }
      household_invitations: {
        Row: {
          id: string
          household_id: string
          invited_email: string
          invited_by: string
          token: string
          status: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          invited_email: string
          invited_by: string
          token?: string
          status?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          status?: string
          expires_at?: string
        }
        Relationships: Relationships
      }
      categories: {
        Row: {
          id: string
          household_id: string | null
          user_id: string | null
          type: string
          name_pl: string
          name_en: string
          icon: string
          color: string
          is_system: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id?: string | null
          user_id?: string | null
          type: string
          name_pl: string
          name_en: string
          icon: string
          color?: string
          is_system?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          type?: string
          name_pl?: string
          name_en?: string
          icon?: string
          color?: string
          sort_order?: number
        }
        Relationships: Relationships
      }
      wallets: {
        Row: {
          id: string
          household_id: string
          name: string
          type: string
          currency: string
          icon: string
          color: string
          initial_balance: number
          credit_limit: number | null
          include_in_net_worth: boolean
          sort_order: number
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          type: string
          currency?: string
          icon?: string
          color?: string
          initial_balance?: number
          credit_limit?: number | null
          include_in_net_worth?: boolean
          sort_order?: number
          archived?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          type?: string
          currency?: string
          icon?: string
          color?: string
          initial_balance?: number
          credit_limit?: number | null
          include_in_net_worth?: boolean
          sort_order?: number
          archived?: boolean
        }
        Relationships: Relationships
      }
      savings_envelopes: {
        Row: {
          id: string
          household_id: string
          name: string
          icon: string
          color: string
          target_amount: number | null
          initial_balance: number
          currency: string
          target_date: string | null
          notes: string | null
          archived: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          icon?: string
          color?: string
          target_amount?: number | null
          initial_balance?: number
          currency?: string
          target_date?: string | null
          notes?: string | null
          archived?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          icon?: string
          color?: string
          target_amount?: number | null
          initial_balance?: number
          currency?: string
          target_date?: string | null
          notes?: string | null
          archived?: boolean
          sort_order?: number
        }
        Relationships: Relationships
      }
      budget_envelopes: {
        Row: {
          id: string
          household_id: string
          category_id: string | null
          name: string
          icon: string
          color: string
          monthly_limit: number
          currency: string
          rollover: boolean
          archived: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id?: string | null
          name: string
          icon?: string
          color?: string
          monthly_limit: number
          currency?: string
          rollover?: boolean
          archived?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          category_id?: string | null
          name?: string
          icon?: string
          color?: string
          monthly_limit?: number
          currency?: string
          rollover?: boolean
          archived?: boolean
          sort_order?: number
        }
        Relationships: Relationships
      }
      investment_portfolios: {
        Row: {
          id: string
          household_id: string
          name: string
          type: string
          icon: string
          color: string
          currency: string
          institution: string | null
          notes: string | null
          archived: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          type?: string
          icon?: string
          color?: string
          currency?: string
          institution?: string | null
          notes?: string | null
          archived?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          type?: string
          icon?: string
          color?: string
          currency?: string
          institution?: string | null
          notes?: string | null
          archived?: boolean
          sort_order?: number
        }
        Relationships: Relationships
      }
      portfolio_valuations: {
        Row: {
          id: string
          portfolio_id: string
          valuation_date: string
          current_value: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          valuation_date: string
          current_value: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          valuation_date?: string
          current_value?: number
          notes?: string | null
        }
        Relationships: Relationships
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          created_by: string | null
          type: string
          category_id: string | null
          wallet_id: string | null
          to_wallet_id: string | null
          savings_envelope_id: string | null
          budget_envelope_id: string | null
          portfolio_id: string | null
          amount: number
          currency: string
          amount_in_base_currency: number | null
          exchange_rate: number | null
          date: string
          description: string | null
          notes: string | null
          tags: string[]
          person: string | null
          is_recurring: boolean
          recurring_id: string | null
          import_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          created_by?: string | null
          type: string
          category_id?: string | null
          wallet_id?: string | null
          to_wallet_id?: string | null
          savings_envelope_id?: string | null
          budget_envelope_id?: string | null
          portfolio_id?: string | null
          amount: number
          currency?: string
          amount_in_base_currency?: number | null
          exchange_rate?: number | null
          date: string
          description?: string | null
          notes?: string | null
          tags?: string[]
          person?: string | null
          is_recurring?: boolean
          recurring_id?: string | null
          import_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          type?: string
          category_id?: string | null
          wallet_id?: string | null
          to_wallet_id?: string | null
          savings_envelope_id?: string | null
          budget_envelope_id?: string | null
          portfolio_id?: string | null
          amount?: number
          currency?: string
          amount_in_base_currency?: number | null
          exchange_rate?: number | null
          date?: string
          description?: string | null
          notes?: string | null
          tags?: string[]
          person?: string | null
          is_recurring?: boolean
          recurring_id?: string | null
          import_hash?: string | null
          updated_at?: string
        }
        Relationships: Relationships
      }
      recurring_transactions: {
        Row: {
          id: string
          household_id: string
          type: string
          category_id: string | null
          wallet_id: string | null
          amount: number
          currency: string
          description: string
          frequency: string
          frequency_value: number
          start_date: string
          end_date: string | null
          next_due_date: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          type: string
          category_id?: string | null
          wallet_id?: string | null
          amount: number
          currency?: string
          description: string
          frequency: string
          frequency_value?: number
          start_date: string
          end_date?: string | null
          next_due_date: string
          active?: boolean
          created_at?: string
        }
        Update: {
          type?: string
          category_id?: string | null
          wallet_id?: string | null
          amount?: number
          currency?: string
          description?: string
          frequency?: string
          frequency_value?: number
          start_date?: string
          end_date?: string | null
          next_due_date?: string
          active?: boolean
        }
        Relationships: Relationships
      }
      exchange_rates: {
        Row: {
          id: string
          base_currency: string
          target_currency: string
          rate: number
          source: string
          fetched_at: string
        }
        Insert: {
          id?: string
          base_currency: string
          target_currency: string
          rate: number
          source?: string
          fetched_at?: string
        }
        Update: {
          rate?: number
          source?: string
          fetched_at?: string
        }
        Relationships: Relationships
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_in_household: {
        Args: { household_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

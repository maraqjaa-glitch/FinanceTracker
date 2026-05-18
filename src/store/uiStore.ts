import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, Language, TransactionFilters, MonthYear } from '@/types'

interface UIState {
  // Theme
  theme: Theme
  accentColor: string
  resolvedTheme: 'dark' | 'light' // system resolved to actual value

  // Language
  language: Language

  // Dashboard filters
  dashboardMonth: MonthYear
  dashboardMemberFilter: string | null // null = all members

  // Transaction filters (persisted across navigation)
  transactionFilters: TransactionFilters

  // Modals
  isAddTransactionOpen: boolean
  editTransactionId: string | null

  // Toast queue
  toasts: Toast[]

  // Actions
  setTheme: (theme: Theme) => void
  setAccentColor: (color: string) => void
  setLanguage: (language: Language) => void
  setDashboardMonth: (month: MonthYear) => void
  setDashboardMemberFilter: (memberId: string | null) => void
  setTransactionFilters: (filters: TransactionFilters) => void
  resetTransactionFilters: () => void
  openAddTransaction: () => void
  closeAddTransaction: () => void
  openEditTransaction: (id: string) => void
  closeEditTransaction: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  applyThemeToDOM: (theme: Theme, accentColor: string) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  description?: string
  duration?: number
}

const now = new Date()
const DEFAULT_FILTERS: TransactionFilters = {}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(theme: Theme, accentColor: string) {
  const resolved = resolveTheme(theme)
  const root = document.documentElement

  // Remove existing theme classes
  root.classList.remove('theme-dark', 'theme-light')
  root.classList.add(`theme-${resolved}`)

  // Apply accent color
  root.style.setProperty('--color-accent', accentColor)
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      accentColor: '#6366f1',
      resolvedTheme: 'dark',
      language: 'pl',

      dashboardMonth: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      dashboardMemberFilter: null,
      transactionFilters: DEFAULT_FILTERS,

      isAddTransactionOpen: false,
      editTransactionId: null,

      toasts: [],

      setTheme: (theme) => {
        const resolved = resolveTheme(theme)
        set({ theme, resolvedTheme: resolved })
        applyTheme(theme, get().accentColor)
      },

      setAccentColor: (accentColor) => {
        set({ accentColor })
        applyTheme(get().theme, accentColor)
      },

      setLanguage: (language) => set({ language }),

      setDashboardMonth: (dashboardMonth) => set({ dashboardMonth }),

      setDashboardMemberFilter: (memberId) =>
        set({ dashboardMemberFilter: memberId }),

      setTransactionFilters: (filters) =>
        set({ transactionFilters: filters }),

      resetTransactionFilters: () =>
        set({ transactionFilters: DEFAULT_FILTERS }),

      openAddTransaction: () =>
        set({ isAddTransactionOpen: true, editTransactionId: null }),

      closeAddTransaction: () =>
        set({ isAddTransactionOpen: false }),

      openEditTransaction: (id) =>
        set({ editTransactionId: id, isAddTransactionOpen: false }),

      closeEditTransaction: () =>
        set({ editTransactionId: null }),

      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const newToast: Toast = { ...toast, id, duration: toast.duration ?? 4000 }
        set((state) => ({ toasts: [...state.toasts, newToast] }))

        // Auto-remove after duration
        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            get().removeToast(id)
          }, newToast.duration)
        }
      },

      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

      applyThemeToDOM: (theme, accentColor) => {
        applyTheme(theme, accentColor)
      },
    }),
    {
      name: 'finfort-ui',
      // Only persist user preferences — not transient UI state
      partialize: (state) => ({
        theme: state.theme,
        accentColor: state.accentColor,
        language: state.language,
        transactionFilters: state.transactionFilters,
      }),
    }
  )
)

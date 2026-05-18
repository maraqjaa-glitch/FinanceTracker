import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCategories } from '@/hooks/useCategories'
import { useUIStore } from '@/store/uiStore'
import { getCategoryName } from '@/types'
import type { CategoryType } from '@/types'

interface Props {
  typeFilter?: CategoryType
  value: string
  onChange: (id: string) => void
  onClose: () => void
}

export default function CategoryPicker({ typeFilter, value, onChange, onClose }: Props) {
  const { t } = useTranslation()
  const { language } = useUIStore()
  const { data: categories = [] } = useCategories(typeFilter)
  const [search, setSearch] = useState('')

  const filtered = categories.filter(c =>
    !search || getCategoryName(c, language).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="w-full h-10 pl-9 pr-9 rounded-xl text-sm outline-none"
          style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
        {filtered.map(cat => {
          const isSelected = cat.id === value
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => { onChange(cat.id); onClose() }}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all"
              style={{
                backgroundColor: isSelected ? `${cat.color}22` : 'var(--color-bg-card)',
                border: `1.5px solid ${isSelected ? cat.color : 'var(--color-border)'}`,
              }}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className="text-[10px] leading-tight font-medium" style={{ color: isSelected ? cat.color : 'var(--color-text-secondary)' }}>
                {getCategoryName(cat, language)}
              </span>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No categories found
          </div>
        )}
      </div>
    </div>
  )
}

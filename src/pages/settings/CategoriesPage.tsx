import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TopHeader from '@/components/layout/TopHeader'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { useUIStore } from '@/store/uiStore'
import { useHouseholdStore } from '@/store/householdStore'
import { getCategoryName } from '@/types'
import type { Category, CategoryType } from '@/types'

// ─── Constants ───────────────────────────────
const TYPE_TABS: { id: CategoryType; label: string }[] = [
  { id: 'expense', label: 'Expenses' },
  { id: 'income',  label: 'Income' },
  { id: 'bill',    label: 'Bills' },
]

const PRESET_COLORS = [
  '#6366f1','#8b5cf6','#10b981','#0ea5e9','#f97316',
  '#ef4444','#f59e0b','#14b8a6','#ec4899','#84cc16',
  '#78716c','#6b7280',
]

const PRESET_ICONS = [
  '🛒','🍽️','🚗','🏠','💊','💪','👗','📱','📚','🎭',
  '✈️','🎁','🐾','💻','🍺','🛠️','🏋️','💼','📈','🎓',
  '💰','🏦','🌟','🔄','🏆','💳','⚡','📡','🎬','🎵',
]

// ─── Category form schema ─────────────────────
const schema = z.object({
  type:    z.enum(['income','expense','bill','transfer']),
  name_en: z.string().min(1, 'Name (EN) is required'),
  name_pl: z.string().min(1, 'Name (PL) is required'),
  icon:    z.string().min(1),
  color:   z.string().min(1),
})
type FormValues = z.infer<typeof schema>

// ─── Category Form Modal ──────────────────────
function CategoryFormModal({ open, onClose, editing }: {
  open: boolean
  onClose: () => void
  editing?: Category | null
}) {
  const { t } = useTranslation()
  const { activeHousehold } = useHouseholdStore()
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory()
  const [iconSearch, setIconSearch] = useState('')

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: editing
        ? { type: editing.type as CategoryType, name_en: editing.name_en, name_pl: editing.name_pl, icon: editing.icon, color: editing.color }
        : { type: 'expense', name_en: '', name_pl: '', icon: '🛒', color: '#6366f1' },
    })

  const watchedIcon  = watch('icon')
  const watchedColor = watch('color')

  const onSubmit = async (values: FormValues) => {
    if (editing) {
      await updateCat.mutateAsync({ id: editing.id, ...values })
    } else {
      await createCat.mutateAsync({
        ...values,
        household_id: activeHousehold!.id,
        user_id: null,
        sort_order: 0,
      })
    }
    onClose()
    reset()
  }

  const isBusy = isSubmitting || createCat.isPending || updateCat.isPending
  const filteredIcons = iconSearch
    ? PRESET_ICONS.filter(ic => ic.includes(iconSearch))
    : PRESET_ICONS

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t('categories.editCategory') : t('categories.addCategory')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Type */}
        <div>
          <label className="label">{t('transactions.type')}</label>
          <Controller name="type" control={control} render={({ field }) => (
            <div className="flex gap-2">
              {TYPE_TABS.map(tab => (
                <button
                  key={tab.id} type="button"
                  onClick={() => field.onChange(tab.id)}
                  className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: field.value === tab.id ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    color: field.value === tab.id ? '#fff' : 'var(--color-text-secondary)',
                    border: `1px solid ${field.value === tab.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )} />
        </div>

        {/* Icon picker */}
        <div>
          <label className="label">Icon</label>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${watchedColor}22`, border: `1.5px solid ${watchedColor}` }}
            >
              {watchedIcon}
            </div>
            <input
              type="text"
              value={iconSearch}
              onChange={e => setIconSearch(e.target.value)}
              placeholder="Search emoji…"
              className="input flex-1"
            />
          </div>
          <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto">
            {filteredIcons.map(ic => (
              <button
                key={ic} type="button"
                onClick={() => setValue('icon', ic)}
                className="w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all"
                style={{
                  backgroundColor: watchedIcon === ic ? `${watchedColor}25` : 'var(--color-bg-elevated)',
                  border: `1px solid ${watchedIcon === ic ? watchedColor : 'var(--color-border)'}`,
                }}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="label">Colour</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c} type="button"
                onClick={() => setValue('color', c)}
                className="w-8 h-8 rounded-full transition-transform active:scale-90"
                style={{
                  backgroundColor: c,
                  outline: watchedColor === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Name EN */}
        <div>
          <label className="label">{t('categories.nameEn')} <span className="text-red-400">*</span></label>
          <input {...register('name_en')} className="input" placeholder="e.g. Groceries"
            onBlur={e => {
              // Auto-populate PL if empty
              const { value } = e.target
              if (value && !watch('name_pl')) setValue('name_pl', value)
            }}
          />
          {errors.name_en && <p className="field-error">{errors.name_en.message}</p>}
        </div>

        {/* Name PL */}
        <div>
          <label className="label">{t('categories.namePl')} <span className="text-red-400">*</span></label>
          <input {...register('name_pl')} className="input" placeholder="np. Spożywcze" />
          {errors.name_pl && <p className="field-error">{errors.name_pl.message}</p>}
        </div>

        <button
          type="submit" disabled={isBusy}
          className="w-full h-12 rounded-2xl font-semibold text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {isBusy ? '...' : t('common.save')}
        </button>
      </form>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────
export default function CategoriesPage() {
  const { t } = useTranslation()
  const { language } = useUIStore()

  const [activeType, setActiveType] = useState<CategoryType>('expense')
  const [formOpen, setFormOpen]     = useState(false)
  const [editCat, setEditCat]       = useState<Category | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)
  const [deleteCatName, setDeleteCatName] = useState('')

  const { data: allCategories = [], isLoading } = useCategories()
  const deleteCat = useDeleteCategory()

  const filtered = allCategories.filter(c => c.type === activeType)
  const systemCats = filtered.filter(c => c.is_system)
  const customCats = filtered.filter(c => !c.is_system)

  const handleEdit = (cat: Category) => {
    setEditCat(cat)
    setFormOpen(true)
  }

  const handleDeleteClick = (cat: Category) => {
    setDeleteCatId(cat.id)
    setDeleteCatName(getCategoryName(cat, language))
  }

  const handleConfirmDelete = async () => {
    if (!deleteCatId) return
    await deleteCat.mutateAsync(deleteCatId)
    setDeleteCatId(null)
  }

  return (
    <div>
      <TopHeader
        title={t('categories.title')}
        showBack
        right={
          <button
            onClick={() => { setEditCat(null); setFormOpen(true) }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      {/* Type tabs */}
      <div className="px-4 pt-3 pb-1">
        <div
          className="flex rounded-2xl p-1"
          style={{ backgroundColor: 'var(--color-bg-elevated)' }}
        >
          {TYPE_TABS.map(tab => (
            <button
              key={tab.id} type="button"
              onClick={() => setActiveType(tab.id)}
              className="flex-1 h-9 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeType === tab.id ? 'var(--color-accent)' : 'transparent',
                color: activeType === tab.id ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-4">

        {isLoading ? (
          <SkeletonList count={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title="No categories yet"
            description="Add a custom category for this type"
            action={
              <button
                onClick={() => { setEditCat(null); setFormOpen(true) }}
                className="px-5 h-10 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {t('categories.addCategory')}
              </button>
            }
          />
        ) : (
          <>
            {/* Custom categories first */}
            {customCats.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {t('categories.custom')} ({customCats.length})
                </p>
                <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {customCats.map(cat => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      language={language}
                      onEdit={() => handleEdit(cat)}
                      onDelete={() => handleDeleteClick(cat)}
                      canDelete
                    />
                  ))}
                </div>
              </div>
            )}

            {/* System categories */}
            {systemCats.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {t('categories.system')} ({systemCats.length})
                </p>
                <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {systemCats.map(cat => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      language={language}
                      canDelete={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CategoryFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditCat(null) }}
        editing={editCat}
      />

      <ConfirmDialog
        open={!!deleteCatId}
        title={`Delete "${deleteCatName}"?`}
        description="Transactions using this category will have their category cleared. This cannot be undone."
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleteCat.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCatId(null)}
      />
    </div>
  )
}

// ─── Category Row ─────────────────────────────
function CategoryRow({ category: cat, language, onEdit, onDelete, canDelete }: {
  category: Category
  language: string
  onEdit?: () => void
  onDelete?: () => void
  canDelete: boolean
}) {
  const name = getCategoryName(cat, language as 'pl' | 'en')
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: `${cat.color}22` }}
      >
        {cat.icon}
      </div>
      <p className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
        {name}
      </p>
      {cat.is_system && (
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}
        >
          system
        </span>
      )}
      {!cat.is_system && onEdit && (
        <button
          onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ color: '#ef444480' }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

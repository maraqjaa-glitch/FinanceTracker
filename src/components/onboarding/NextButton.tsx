import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

interface Props {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  label?: string
  skipLabel?: string
  onSkip?: () => void
}

export default function NextButton({ onClick, disabled, loading, label, skipLabel, onSkip }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 mt-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl font-semibold text-sm text-white transition-opacity disabled:opacity-40"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        {loading ? (
          <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <>
            {label ?? t('common.next')}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm py-2 text-center"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {skipLabel ?? t('common.skip')}
        </button>
      )}
    </div>
  )
}

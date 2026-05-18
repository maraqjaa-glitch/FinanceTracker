import { useNavigate } from 'react-router-dom'
import { Settings, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface TopHeaderProps {
  title?: string
  showBack?: boolean
  showSettings?: boolean
  right?: React.ReactNode
}

export default function TopHeader({
  title,
  showBack = false,
  showSettings = false,
  right,
}: TopHeaderProps) {
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-40 glass pt-safe">
      <div className="flex items-center h-14 px-4 max-w-lg mx-auto gap-3">
        {/* Left: back button or avatar */}
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => navigate('/settings/profile')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold text-white flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-label="Profile settings"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={initials}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </button>
        )}

        {/* Center: title */}
        {title && (
          <h1 className="flex-1 text-base font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h1>
        )}
        {!title && <div className="flex-1" />}

        {/* Right slot */}
        {right ?? (
          showSettings && (
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )
        )}
      </div>
    </header>
  )
}

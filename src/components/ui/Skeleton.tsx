interface Props {
  className?: string
  lines?: number
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} style={{ height: '14px', borderRadius: '6px' }} />
}

export function SkeletonCard({ lines = 3 }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === 0 ? 'w-1/3' : i === 1 ? 'w-full h-7' : 'w-2/3'} />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-2/3" />
          </div>
          <SkeletonLine className="w-16" />
        </div>
      ))}
    </div>
  )
}

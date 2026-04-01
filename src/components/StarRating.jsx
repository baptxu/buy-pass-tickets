const STAR_PATH = 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111 5.518.442a.562.562 0 0 1 .32.988l-4.205 3.605 1.285 5.394a.562.562 0 0 1-.84.611L12 16.795 7.277 19.65a.562.562 0 0 1-.84-.61l1.285-5.395L3.517 10.04a.562.562 0 0 1 .32-.988l5.518-.442 2.125-5.111Z'

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 'md',
}) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => {
        const active = star <= value
        const colorClass = active ? 'text-amber-300' : 'text-[#3A3F56]'

        if (readOnly) {
          return (
            <svg key={star} viewBox="0 0 24 24" className={`${iconSize} ${colorClass}`} fill="currentColor" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          )
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className={`transition-transform hover:scale-110 ${colorClass}`}
            aria-label={`${star} etoile${star > 1 ? 's' : ''}`}
          >
            <svg viewBox="0 0 24 24" className={iconSize} fill="currentColor" aria-hidden="true">
              <path d={STAR_PATH} />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

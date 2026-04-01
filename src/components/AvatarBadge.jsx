const SIZE_MAP = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
}

export default function AvatarBadge({ profile, size = 'md', className = '' }) {
  const label = profile?.full_name?.trim() || profile?.email || 'Utilisateur'
  const initial = label.charAt(0).toUpperCase()
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={label}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-[#2A2D3E] ${className}`.trim()}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-[#4F8EF7] to-[#1D9E75] text-white font-semibold flex items-center justify-center ring-2 ring-[#2A2D3E] ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      {initial}
    </div>
  )
}

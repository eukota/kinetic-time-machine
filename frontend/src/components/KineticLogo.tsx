interface MarkProps {
  size?: number
  className?: string
}

/** Whimsical side-view kinetic sculpture — wheels, wobbly frame, pennant, camera lens */
export const KineticLogoMark = ({ size = 44, className = '' }: MarkProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    {/* ground shadow */}
    <ellipse cx="24" cy="42" rx="18" ry="2.5" fill="#1B263B" opacity="0.25" />

    {/* rear wheel */}
    <circle cx="13" cy="33" r="10" fill="#FCBF49" stroke="#1B263B" strokeWidth="2.5" />
    <circle cx="13" cy="33" r="3" fill="#1B263B" />
    <line x1="13" y1="23" x2="13" y2="43" stroke="#1B263B" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="3" y1="33" x2="23" y2="33" stroke="#1B263B" strokeWidth="1.5" strokeLinecap="round" />

    {/* front wheel */}
    <circle cx="35" cy="33" r="10" fill="#D62828" stroke="#1B263B" strokeWidth="2.5" />
    <circle cx="35" cy="33" r="3" fill="#1B263B" />
    <line x1="35" y1="23" x2="35" y2="43" stroke="#1B263B" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="25" y1="33" x2="45" y2="33" stroke="#1B263B" strokeWidth="1.5" strokeLinecap="round" />

    {/* chassis / body — deliberately lopsided */}
    <path
      d="M8 28 Q14 14 24 12 Q34 10 40 22 L38 28 Q28 26 20 28 Q12 30 8 28Z"
      fill="#2A9D8F"
      stroke="#1B263B"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />

    {/* camera lens (photo tracker) */}
    <circle cx="28" cy="18" r="5" fill="#FFF9EB" stroke="#1B263B" strokeWidth="2" />
    <circle cx="28" cy="18" r="2.5" fill="#1B263B" />
    <circle cx="29.5" cy="16.5" r="1" fill="#FCBF49" opacity="0.9" />

    {/* pennant */}
    <line x1="18" y1="14" x2="18" y2="6" stroke="#1B263B" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 6 L26 9 L18 12Z" fill="#D62828" stroke="#1B263B" strokeWidth="1.5" strokeLinejoin="round" />

    {/* spiral time-swirl on rear body */}
    <path
      d="M12 22 C12 19 15 17 17 19 C19 21 16 24 14 22 C12 20 14 18 15 19"
      stroke="#FCBF49"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

interface WordmarkProps {
  compact?: boolean
  theme?: 'dark' | 'light'
}

export const KineticWordmark = ({ compact = false, theme = 'dark' }: WordmarkProps) => {
  const onDark = theme === 'dark'

  return (
    <div className="min-w-0">
      <h1
        className={`font-display leading-none tracking-wide ${
          compact ? 'text-2xl' : 'text-3xl'
        } ${onDark ? 'text-kinetic-gold' : 'text-kinetic-navy'}`}
        style={{
          textShadow: onDark
            ? '2px 2px 0 #1B263B, 3px 3px 0 #D62828'
            : '2px 2px 0 #FCBF49, 3px 3px 0 rgba(214, 40, 40, 0.35)',
        }}
      >
        Kinetic Time Machine
      </h1>
      <p
        className={`text-xs font-bold mt-0.5 truncate ${
          onDark ? 'text-kinetic-cream/90' : 'text-kinetic-navy/75'
        }`}
      >
        Race-Day Photo Tracker · For the Glory!
      </p>
    </div>
  )
}

interface LogoProps {
  compact?: boolean
  theme?: 'dark' | 'light'
  href?: string
  onNavigate?: () => void
}

export const KineticLogo = ({ compact = false, theme = 'dark', href, onNavigate }: LogoProps) => {
  const content = (
    <>
      <div
        className={`flex-shrink-0 rounded-xl border-[2.5px] border-kinetic-navy shadow-kinetic-sm p-0.5 ${
          theme === 'dark' ? 'bg-kinetic-cream' : 'bg-white'
        }`}
      >
        <KineticLogoMark size={compact ? 36 : 44} />
      </div>
      <KineticWordmark compact={compact} theme={theme} />
    </>
  )

  const className = `flex items-center gap-3 ${compact ? 'py-0' : ''} ${
    href ? 'no-underline hover:opacity-90 transition-opacity' : ''
  }`

  if (!href) {
    return <div className={className}>{content}</div>
  }

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        onNavigate?.()
      }}
      data-cta-action="switch-tab"
      data-cta-label="Map"
      data-cta-destination={href}
      aria-label="Kinetic Time Machine — go to map"
      className={className}
    >
      {content}
    </a>
  )
}

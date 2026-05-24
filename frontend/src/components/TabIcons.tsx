import type { AppView } from '../lib/routing'

interface TabIconProps {
  size?: number
  active?: boolean
  className?: string
}

type TabIconComponent = (props: TabIconProps) => JSX.Element

const navy = '#1B263B'
const gold = '#FCBF49'
const cream = '#FFF9EB'
const red = '#D62828'
const teal = '#2A9D8F'

const stroke = (active: boolean) => (active ? navy : cream)
const muted = (active: boolean) => (active ? `${navy}99` : `${cream}cc`)
const sw = (n = 2.25) => String(n)
const fillInactive = (active: boolean, color: string) => (active ? color : `${color}bb`)

/** Folded map with three-day race route + pin */
export const MapTabIcon = ({ size = 24, active = false, className = '' }: TabIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M4 6.5 9 4.5v13L4 19.5V6.5Zm10-2 5 2v13l-5-2V4.5Z"
      fill={fillInactive(active, cream)}
      stroke={stroke(active)}
      strokeWidth={sw()}
      strokeLinejoin="round"
    />
    <path d="M9 4.5v13" stroke={stroke(active)} strokeWidth={sw()} />
    <path
      d="M5.5 10c1.5-1 3-1 4 0s3 1 4.5 0"
      stroke={active ? '#2563eb' : gold}
      strokeWidth={sw(2.5)}
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M5.5 13.5c2-.5 3.5-.5 5.5 0"
      stroke={active ? '#16a34a' : gold}
      strokeWidth={sw(2.5)}
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M5.5 16.5c1.5.5 3 .5 4.5 0"
      stroke={active ? '#F77F00' : gold}
      strokeWidth={sw(2.5)}
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="15" cy="9" r="2.25" fill={active ? red : gold} stroke={stroke(active)} strokeWidth={sw(2)} />
    <circle cx="15" cy="9" r="0.75" fill={active ? cream : navy} />
  </svg>
)

/** Polaroid stack — photo gallery */
export const GalleryTabIcon = ({ size = 24, active = false, className = '' }: TabIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect
      x="3" y="5" width="11" height="14" rx="1.5"
      fill={fillInactive(active, cream)}
      stroke={stroke(active)}
      strokeWidth={sw()}
      transform="rotate(-6 8.5 12)"
    />
    <rect
      x="10" y="4" width="11" height="14" rx="1.5"
      fill={fillInactive(active, gold)}
      stroke={stroke(active)}
      strokeWidth={sw()}
    />
    <circle cx="14" cy="8.5" r="1.75" fill={active ? red : gold} stroke={stroke(active)} strokeWidth={sw(1.75)} />
    <path
      d="M12 13.5l2-2 2 2 2-3 2 3v2.5H12V13.5Z"
      fill={active ? teal : `${teal}cc`}
      stroke={stroke(active)}
      strokeWidth={sw(2)}
      strokeLinejoin="round"
    />
  </svg>
)

/** Carnival pennant + star — about / glory */
export const AboutTabIcon = ({ size = 24, active = false, className = '' }: TabIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <line x1="7" y1="4" x2="7" y2="20" stroke={stroke(active)} strokeWidth={sw(2.5)} strokeLinecap="round" />
    <path
      d="M7 4h9l-2.5 3L16 10l-3.5 3L16 16l-9-2V4Z"
      fill={fillInactive(active, red)}
      stroke={stroke(active)}
      strokeWidth={sw()}
      strokeLinejoin="round"
    />
    <path
      d="M17.5 17.5 19 21l-3.5-1.5L12 21l1.5-3.5L12 14l3.5 1.5L19 14l-1.5 3.5Z"
      fill={gold}
      stroke={stroke(active)}
      strokeWidth={sw(2)}
      strokeLinejoin="round"
    />
  </svg>
)

/** Clipboard with approval stamp — admin review */
export const AdminTabIcon = ({ size = 24, active = false, className = '' }: TabIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <rect
      x="5" y="4" width="14" height="18" rx="2"
      fill={fillInactive(active, cream)}
      stroke={stroke(active)}
      strokeWidth={sw()}
    />
    <rect
      x="9" y="2.5" width="6" height="3.5" rx="1.25"
      fill={gold}
      stroke={stroke(active)}
      strokeWidth={sw(2)}
    />
    <line x1="8.5" y1="10" x2="15.5" y2="10" stroke={muted(active)} strokeWidth={sw(2)} strokeLinecap="round" />
    <line x1="8.5" y1="13.5" x2="13" y2="13.5" stroke={muted(active)} strokeWidth={sw(2)} strokeLinecap="round" />
    <circle cx="15.5" cy="16.5" r="3.25" fill={active ? teal : `${teal}dd`} stroke={stroke(active)} strokeWidth={sw(2)} />
    <path
      d="M14 16.5l1 1 2.25-2.5"
      stroke={active ? cream : navy}
      strokeWidth={sw(2.25)}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Rolled three-day map — Course Day filter heading */
export const CourseDayHeadingIcon = ({ size = 34, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={`flex-shrink-0 -rotate-6 ${className}`}
    aria-hidden
  >
    <path
      d="M4 7 14 4v21L4 28V7Z"
      fill="#FFF9EB"
      stroke="#1B263B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M14 4 26 8.5v20L14 24.5V4Z"
      fill="#FCBF49"
      stroke="#1B263B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M14 4v20.5" stroke="#1B263B" strokeWidth="2" />
    <path
      d="M7 11.5c2.2-2.2 4.5-1 6 0.8s4 2.2 6.5 0.5"
      stroke="#2563eb"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M7 15.5c2.8-1.2 5.2 0.2 7 1.8s4.5 2 7 0.2"
      stroke="#16a34a"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M7 19.5c2.2-1.8 4.8-0.5 6.5 1.2s4.8 2.2 7.5 0"
      stroke="#F77F00"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="21.5" cy="10.5" r="3.25" fill="#D62828" stroke="#1B263B" strokeWidth="2" />
    <circle cx="21.5" cy="10.5" r="1.1" fill="#FFF9EB" />
    <path
      d="M24.5 5.5h5.5l-2.75 3.25L30 5.5Z"
      fill="#2A9D8F"
      stroke="#1B263B"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

export type TabId = AppView

/** Bold chevron for the map sidebar open/close tab */
export const SidebarToggleIcon = ({
  open,
  size = 32,
  className = '',
}: {
  open: boolean
  size?: number
  className?: string
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={`transition-transform duration-200 drop-shadow-[0_1px_0_rgba(27,38,59,0.35)] ${open ? 'rotate-180' : ''} ${className}`}
  >
    <path
      d="M15 5.5 9 12l6 6.5"
      stroke="currentColor"
      strokeWidth="3.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Sliders hint on the sidebar tab */
export const SidebarFiltersIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
    <path
      d="M4 7h16M4 12h10M4 17h13"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
    />
    <circle cx="17" cy="7" r="2.25" fill="currentColor" />
    <circle cx="11" cy="12" r="2.25" fill="currentColor" />
    <circle cx="14" cy="17" r="2.25" fill="currentColor" />
  </svg>
)

const ICONS: Record<TabId, TabIconComponent> = {
  map: MapTabIcon,
  gallery: GalleryTabIcon,
  about: AboutTabIcon,
  admin: AdminTabIcon,
}

export const TabIcon = ({ id, active }: { id: TabId; active: boolean }) => {
  const Icon = ICONS[id]
  return <Icon active={active} size={24} className="flex-shrink-0" />
}

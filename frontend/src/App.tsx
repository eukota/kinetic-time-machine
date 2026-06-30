import { useState, useEffect, useCallback } from 'react'
import { Map } from './components/Map'
import { Gallery } from './components/Gallery'
import { About } from './components/About'
import { Admin } from './components/Admin'
import { SubmissionForm } from './components/SubmissionForm'
import { SubmissionModal } from './components/SubmissionModal'
import { TeamFilter } from './components/TeamFilter'
import { CourseFilter } from './components/CourseFilter'
import { TrackerFilter } from './components/TrackerFilter'
import { BuildInfoStamp } from './components/BuildInfoStamp'
import { KineticLogo } from './components/KineticLogo'
import { TabIcon, SidebarToggleIcon, SidebarFiltersIcon } from './components/TabIcons'
import { RegisterTracker } from './pages/RegisterTracker'
import { TeamDetail } from './pages/TeamDetail'
import { TrackLocation } from './pages/TrackLocation'
import { Tracking } from './pages/Tracking'
import { useViewRoute, viewToPath, type AppView } from './hooks/useViewRoute'
import { useTrackerLocations } from './hooks/useTrackerLocations'
import { useTokenTracking } from './hooks/useTokenTracking'
import { isTrackingActive, getTrackingTeamName } from './utils/trackingStorage'

type NavTabId = Exclude<AppView, 'admin' | 'register-tracker' | 'team-detail' | 'track-location'>

const TABS: { id: NavTabId; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'about', label: 'About' },
]

const NavTab = ({ id, label, active, onClick, className = '' }: {
  id: NavTabId
  label: string
  active: boolean
  onClick: () => void
  className?: string
}) => (
  <a
    href={viewToPath(id)}
    onClick={(e) => {
      e.preventDefault()
      onClick()
    }}
    data-cta-action="switch-tab"
    data-cta-label={label}
    data-cta-destination={viewToPath(id)}
    aria-current={active ? 'page' : undefined}
    className={`kinetic-tab inline-flex items-center gap-2 no-underline ${active ? 'kinetic-tab-active' : 'kinetic-tab-inactive'} ${className}`}
  >
    <TabIcon id={id} active={active} />
    {label}
  </a>
)

export default function App() {
  const [showForm, setShowForm] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [visibleTrackers, setVisibleTrackers] = useState<Set<string>>(new Set())
  const [hiddenTrackers, setHiddenTrackers] = useState<Set<string>>(new Set())
  const [isTracking, setIsTracking] = useState(false)
  const { view, teamId, setView } = useViewRoute()
  const { locations: trackerLocations } = useTrackerLocations(30000)
  const handleTrackingError = useCallback((error: string) => {
    console.error('Tracking error:', error)
    setIsTracking(false)
  }, [])
  const { isTokenValid, trackingError } = useTokenTracking({
    enabled: view === 'map',
    onError: handleTrackingError,
  })

  // Check tracking status on mount and when token validity changes
  useEffect(() => {
    setIsTracking(isTrackingActive())
  }, [])

  // Update tracking indicator when token validity changes
  useEffect(() => {
    setIsTracking(isTokenValid)
  }, [isTokenValid])

  // Auto-show any tracker that appears in poll results unless the user explicitly hid it
  useEffect(() => {
    setVisibleTrackers(prev => {
      const next = new Set(prev)
      let changed = false
      for (const loc of trackerLocations) {
        if (!next.has(loc.team_id) && !hiddenTrackers.has(loc.team_id)) {
          next.add(loc.team_id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [trackerLocations, hiddenTrackers])

  const handleTrackerVisibility = (teamId: string, visible: boolean) => {
    setHiddenTrackers(prev => {
      const next = new Set(prev)
      if (visible) next.delete(teamId)
      else next.add(teamId)
      return next
    })
    setVisibleTrackers(prev => {
      const next = new Set(prev)
      if (visible) next.add(teamId)
      else next.delete(teamId)
      return next
    })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden font-body">
      <div id="ktm-analytics-sink" aria-hidden className="sr-only" />

      <div className="h-2 flex-shrink-0 bg-kinetic-stripes" aria-hidden />

      <div className="flex-shrink-0 bg-kinetic-navy border-b-4 border-kinetic-gold">
        <div className="hidden md:flex items-center justify-between px-5 py-3 gap-4">
          <KineticLogo theme="dark" href={viewToPath('map')} onNavigate={() => setView('map')} />
          <nav
            data-component="tab-nav"
            data-component-version="1.0"
            data-component-category="navigation"
            data-analytics-persistent="true"
            className="flex gap-1.5"
          >
            {TABS.map(({ id, label }) => (
              <NavTab
                key={id}
                id={id}
                label={label}
                active={view === id}
                onClick={() => setView(id)}
                className="!py-2.5 !px-4"
              />
            ))}
          </nav>
          {isTracking && (
            <div className="kinetic-tracking-pulse ml-auto">
              <div className="kinetic-pulse-dot" />
              <span>Tracking: {getTrackingTeamName() || 'Active'}</span>
            </div>
          )}
        </div>

        <nav
          data-component="tab-nav"
          data-component-version="1.0"
          data-component-category="navigation"
          data-analytics-persistent="true"
          className="md:hidden flex overflow-x-auto px-2 py-2 gap-1"
        >
          {TABS.map(({ id, label }) => (
            <NavTab
              key={id}
              id={id}
              label={label}
              active={view === id}
              onClick={() => setView(id)}
              className="flex-shrink-0"
            />
          ))}
        </nav>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden bg-kinetic-navy">
        <div className="flex-1 relative overflow-hidden flex flex-col">

          {view === 'map' && (
            <div className="md:hidden bg-kinetic-cream border-b-2 border-kinetic-navy/20 px-4 py-2">
              <KineticLogo compact theme="light" href={viewToPath('map')} onNavigate={() => setView('map')} />
            </div>
          )}

          <div
            data-component="map-view"
            data-component-version="1.0"
            data-component-category="content"
            data-entity-type="page"
            data-entity-id="page_map"
            className={view === 'map' ? 'flex-1 min-h-0' : 'hidden'}
          >
            <Map visibleTrackers={visibleTrackers} />
          </div>

          {view === 'gallery' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <Gallery />
            </div>
          )}

          {view === 'tracking' && (
            <div
              data-component="tracking-page"
              data-component-version="1.0"
              data-component-category="content"
              data-entity-type="page"
              data-entity-id="page_tracking"
              className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-kinetic-cream"
            >
              <Tracking onNavigate={setView} />
            </div>
          )}

          {view === 'about' && (
            <div
              data-component="about-page"
              data-component-version="1.0"
              data-component-category="content"
              data-entity-type="page"
              data-entity-id="page_about"
              className="flex-1 min-h-0 flex flex-col"
            >
              <About onNavigate={setView} />
            </div>
          )}

          {view === 'admin' && (
            <div
              data-component="admin-panel"
              data-component-version="1.0"
              data-component-category="admin"
              data-entity-type="page"
              data-entity-id="page_admin"
              className="flex-1 min-h-0 flex flex-col"
            >
              <Admin />
            </div>
          )}

          {view === 'register-tracker' && (
            <div
              data-component="register-tracker-page"
              data-component-version="1.0"
              data-component-category="content"
              data-entity-type="page"
              data-entity-id="page_register_tracker"
              className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-kinetic-cream"
            >
              <RegisterTracker onNavigate={setView} />
            </div>
          )}

          {view === 'team-detail' && teamId && (
            <div
              data-component="team-detail-page"
              data-component-version="1.0"
              data-component-category="content"
              data-entity-type="page"
              data-entity-id="page_team_detail"
              className="flex-1 min-h-0 flex flex-col"
            >
              <TeamDetail teamId={teamId} onBack={() => setView('map')} />
            </div>
          )}

          {view === 'track-location' && teamId && (
            <div
              data-component="track-location-page"
              data-component-version="1.0"
              data-component-category="content"
              data-entity-type="page"
              data-entity-id="page_track_location"
              className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-kinetic-cream"
            >
              <TrackLocation teamId={teamId} />
            </div>
          )}

          {view === 'map' && (
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="kinetic-sidebar-toggle"
              data-cta-action="toggle-sidebar"
              data-cta-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              aria-expanded={sidebarOpen}
              aria-controls="map-sidebar"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <span className="absolute top-0 inset-x-0 h-1.5 bg-kinetic-stripes" aria-hidden />
              <SidebarFiltersIcon className="mt-1.5 opacity-75" />
              <SidebarToggleIcon open={sidebarOpen} />
            </button>
          )}

          {showForm && view === 'map' && (
            <div className="md:hidden fixed inset-0 z-[998] flex flex-col justify-end">
              <div className="bg-kinetic-navy/60 absolute inset-0" onClick={() => setShowForm(false)} />
              <div className="relative bg-kinetic-cream border-t-4 border-kinetic-gold rounded-t-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="h-1 bg-kinetic-stripes flex-shrink-0" aria-hidden />
                <div className="p-4 overflow-y-auto">
                  <SubmissionForm onClose={() => setShowForm(false)} />
                </div>
              </div>
            </div>
          )}
          {showTeams && view === 'map' && (
            <div className="md:hidden fixed inset-0 z-[998] flex flex-col justify-end">
              <div className="bg-kinetic-navy/60 absolute inset-0" onClick={() => setShowTeams(false)} />
              <div className="relative bg-kinetic-cream border-t-4 border-kinetic-gold rounded-t-2xl max-h-[60vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="h-1 bg-kinetic-stripes flex-shrink-0" aria-hidden />
                <div className="p-4 overflow-y-auto space-y-4">
                  <p className="kinetic-sidebar-heading !mb-0">Filters</p>
                  <CourseFilter />
                  <TeamFilter />
                  <TrackerFilter
                    trackers={trackerLocations}
                    visibleTeams={visibleTrackers}
                    onVisibilityChange={handleTrackerVisibility}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {view === 'map' && (
          <aside
            id="map-sidebar"
            className={`hidden md:flex flex-col bg-kinetic-cream border-l-4 border-kinetic-gold overflow-y-auto transition-all duration-200 flex-shrink-0 ${
              sidebarOpen ? 'w-80' : 'w-0 border-l-0 overflow-hidden'
            }`}
          >
            <div className="kinetic-sidebar-section bg-kinetic-parchment/50">
              <SubmissionForm />
            </div>
            <div className="kinetic-sidebar-section">
              <p className="kinetic-sidebar-heading">Filters</p>
              <CourseFilter />
            </div>
            <div className="kinetic-sidebar-section">
              <TeamFilter />
            </div>
            <div className="kinetic-sidebar-section flex-1">
              <TrackerFilter
                trackers={trackerLocations}
                visibleTeams={visibleTrackers}
                onVisibilityChange={handleTrackerVisibility}
              />
            </div>
            <div className="p-3 min-w-[320px] border-t-2 border-dashed border-kinetic-duct text-center">
              <p className="text-[10px] font-bold text-kinetic-navy/40 uppercase tracking-widest">
                Unofficial fan tracker · Not affiliated with Kinetic Universe
              </p>
            </div>
          </aside>
        )}
      </div>

      {view === 'map' && (
        <div
          data-component="mobile-fab"
          data-component-version="1.0"
          data-component-category="navigation"
          className="md:hidden fixed bottom-8 right-4 flex flex-col gap-3 z-[2000]"
        >
          <button
            type="button"
            onClick={() => { setShowForm((open) => !open); setShowTeams(false) }}
            data-cta-action="toggle-submit-form"
            data-cta-label={showForm ? 'Close submit form' : 'Submit photo'}
            className="kinetic-btn-primary rounded-full w-14 h-14 text-3xl flex items-center justify-center !p-0"
            aria-label={showForm ? 'Close submit form' : 'Submit photo'}
            aria-expanded={showForm}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => { setShowTeams((open) => !open); setShowForm(false) }}
            data-cta-action="toggle-filters-panel"
            data-cta-label={showTeams ? 'Close filters' : 'Open filters'}
            className="kinetic-btn-secondary rounded-full w-14 h-14 flex items-center justify-center text-lg !p-0"
            aria-label={showTeams ? 'Close filters' : 'Open filters'}
            aria-expanded={showTeams}
          >
            ☰
          </button>
        </div>
      )}

      <SubmissionModal />

      <BuildInfoStamp />
    </div>
  )
}

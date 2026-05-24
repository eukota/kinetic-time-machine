import { useState } from 'react'
import { Map } from './components/Map'
import { Gallery } from './components/Gallery'
import { About } from './components/About'
import { Admin } from './components/Admin'
import { SubmissionForm } from './components/SubmissionForm'
import { SubmissionModal } from './components/SubmissionModal'
import { TeamFilter } from './components/TeamFilter'
import { CourseFilter } from './components/CourseFilter'
import { KineticLogo } from './components/KineticLogo'
import { TabIcon } from './components/TabIcons'
import { useViewRoute, viewToPath, type AppView } from './hooks/useViewRoute'

type NavTabId = Exclude<AppView, 'admin'>

const TABS: { id: NavTabId; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'gallery', label: 'Gallery' },
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
  const { view, setView } = useViewRoute()

  return (
    <div className="h-screen flex flex-col overflow-hidden font-body">
      <div id="ktm-analytics-sink" aria-hidden className="sr-only" />

      <div className="h-2 flex-shrink-0 bg-kinetic-stripes" aria-hidden />

      <div className="flex-shrink-0 bg-kinetic-navy border-b-4 border-kinetic-gold">
        <div className="hidden md:flex items-end justify-between px-4 pt-1 pb-0">
          <KineticLogo theme="dark" />
          <nav
            data-component="tab-nav"
            data-component-version="1.0"
            data-component-category="navigation"
            data-analytics-persistent="true"
            className="flex gap-0.5 pb-0"
          >
            {TABS.map(({ id, label }) => (
              <NavTab
                key={id}
                id={id}
                label={label}
                active={view === id}
                onClick={() => setView(id)}
              />
            ))}
          </nav>
        </div>

        <nav
          data-component="tab-nav"
          data-component-version="1.0"
          data-component-category="navigation"
          data-analytics-persistent="true"
          className="md:hidden flex overflow-x-auto px-2 pt-1 pb-0 gap-0.5"
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
              <KineticLogo compact theme="light" />
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
            <Map />
          </div>

          {view === 'gallery' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <Gallery />
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

          {view === 'map' && (
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="hidden md:flex absolute top-0 right-0 z-[500] items-center justify-center
                         bg-kinetic-gold border-2 border-kinetic-navy shadow-kinetic-sm rounded-b-lg
                         w-8 h-8 text-kinetic-navy font-bold hover:bg-kinetic-orange hover:text-white transition-colors"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              {sidebarOpen ? '›' : '‹'}
            </button>
          )}

          {view === 'map' && (
            <div
              data-component="mobile-fab"
              data-component-version="1.0"
              data-component-category="navigation"
              className="md:hidden fixed bottom-6 right-4 flex flex-col gap-3 z-[999]"
            >
              <button
                type="button"
                onClick={() => { setShowForm(true); setShowTeams(false) }}
                data-cta-action="open-submit-form"
                data-cta-label="Submit photo"
                className="kinetic-btn-primary rounded-full w-14 h-14 text-3xl flex items-center justify-center !p-0"
                aria-label="Submit photo"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => { setShowTeams(true); setShowForm(false) }}
                data-cta-action="open-filters-panel"
                data-cta-label="Filters"
                className="kinetic-btn-secondary rounded-full w-14 h-14 flex items-center justify-center text-lg !p-0"
                aria-label="Filters"
              >
                ☰
              </button>
            </div>
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
                </div>
              </div>
            </div>
          )}
        </div>

        {view === 'map' && (
          <aside
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
            <div className="kinetic-sidebar-section flex-1">
              <TeamFilter />
            </div>
            <div className="p-3 min-w-[320px] border-t-2 border-dashed border-kinetic-duct text-center">
              <p className="text-[10px] font-bold text-kinetic-navy/40 uppercase tracking-widest">
                Unofficial fan tracker · Not affiliated with Kinetic Universe
              </p>
            </div>
          </aside>
        )}
      </div>

      <SubmissionModal />
    </div>
  )
}

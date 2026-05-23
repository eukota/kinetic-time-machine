import { useState } from 'react'
import { Map } from './components/Map'
import { Gallery } from './components/Gallery'
import { About } from './components/About'
import { Admin } from './components/Admin'
import { SubmissionForm } from './components/SubmissionForm'
import { SubmissionModal } from './components/SubmissionModal'
import { TeamFilter } from './components/TeamFilter'
import { CourseFilter } from './components/CourseFilter'
import { YearFilter } from './components/YearFilter'
import { useViewRoute, viewToPath, type AppView } from './hooks/useViewRoute'

const TAB_LABELS: Record<AppView, string> = {
  map: '🗺 Map',
  gallery: '📷 Gallery',
  about: 'ℹ About',
  admin: '🔒 Admin',
}

export default function App() {
  const [showForm, setShowForm] = useState(false)
  const [showTeams, setShowTeams] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { view, setView } = useViewRoute()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div id="ktm-analytics-sink" aria-hidden className="sr-only" />

      {/* Tab bar */}
      <nav
        data-component="tab-nav"
        data-component-version="1.0"
        data-component-category="navigation"
        data-analytics-persistent="true"
        className="flex items-center bg-white border-b flex-shrink-0 px-2 gap-0"
      >
        {(['map', 'gallery', 'about', 'admin'] as AppView[]).map((v) => (
          <a
            key={v}
            href={viewToPath(v)}
            onClick={(e) => {
              e.preventDefault()
              setView(v)
            }}
            data-cta-action="switch-tab"
            data-cta-label={TAB_LABELS[v]}
            data-cta-destination={viewToPath(v)}
            aria-current={view === v ? 'page' : undefined}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors no-underline ${
              view === v
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {TAB_LABELS[v]}
          </a>
        ))}
      </nav>

      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="flex-1 relative overflow-hidden flex flex-col">

          {view === 'map' && (
            <div className="md:hidden px-4 py-3 border-b bg-white/95 backdrop-blur-sm">
              <h1 className="text-lg font-bold text-gray-800 leading-tight">Kinetic Time Machine</h1>
              <p className="text-xs text-gray-500 leading-tight">Kinetic Grand Championship Race Tracker</p>
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
              <About />
            </div>
          )}

          {view === 'admin' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <Admin />
            </div>
          )}

          {view === 'map' && (
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="hidden md:flex absolute top-0 z-[500] items-center justify-center
                         bg-white border border-gray-200 border-t-0 shadow-md rounded-b-md w-7 h-7 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors text-sm"
              style={{ right: sidebarOpen ? '320px' : '0' }}
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
                className="bg-blue-600 text-white rounded-full w-14 h-14 text-2xl shadow-lg flex items-center justify-center"
              >+</button>
              <button
                type="button"
                onClick={() => { setShowTeams(true); setShowForm(false) }}
                data-cta-action="open-filters-panel"
                data-cta-label="Filters"
                className="bg-white text-gray-700 rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-sm font-bold border"
              >&#9776;</button>
            </div>
          )}

          {showForm && view === 'map' && (
            <div className="md:hidden fixed inset-0 z-[998] flex flex-col justify-end">
              <div className="bg-black/40 absolute inset-0" onClick={() => setShowForm(false)} />
              <div className="relative bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto shadow-2xl">
                <SubmissionForm onClose={() => setShowForm(false)} />
              </div>
            </div>
          )}
          {showTeams && view === 'map' && (
            <div className="md:hidden fixed inset-0 z-[998] flex flex-col justify-end">
              <div className="bg-black/40 absolute inset-0" onClick={() => setShowTeams(false)} />
              <div className="relative bg-white rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto shadow-2xl space-y-4">
                <YearFilter />
                <CourseFilter />
                <TeamFilter />
              </div>
            </div>
          )}
        </div>

        {view === 'map' && (
          <aside
            className={`hidden md:flex flex-col bg-gray-50 border-l overflow-y-auto transition-all duration-200 flex-shrink-0 ${
              sidebarOpen ? 'w-80' : 'w-0 border-l-0 overflow-hidden'
            }`}
          >
            <div className="p-4 border-b min-w-[320px]">
              <h1 className="text-lg font-bold text-gray-800">Kinetic Time Machine</h1>
              <p className="text-xs text-gray-500">Kinetic Grand Championship Race Tracker</p>
            </div>
            <div className="p-4 border-b min-w-[320px]">
              <SubmissionForm />
            </div>
            <div className="p-4 border-b min-w-[320px]">
              <YearFilter />
            </div>
            <div className="p-4 border-b min-w-[320px]">
              <CourseFilter />
            </div>
            <div className="p-4 min-w-[320px]">
              <TeamFilter />
            </div>
          </aside>
        )}
      </div>

      <SubmissionModal />
    </div>
  )
}

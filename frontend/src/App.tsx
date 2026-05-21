import { useState } from 'react'
import { useStore } from './store'
import { Map } from './components/Map'
import { SubmissionForm } from './components/SubmissionForm'
import { SubmissionModal } from './components/SubmissionModal'
import { TeamFilter } from './components/TeamFilter'

export default function App() {
  const { selectedSubmission } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [showTeams, setShowTeams] = useState(false)

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 relative">
        <Map />
        <div className="md:hidden fixed bottom-6 right-4 flex flex-col gap-3 z-[999]">
          <button
            onClick={() => { setShowForm(true); setShowTeams(false) }}
            className="bg-blue-600 text-white rounded-full w-14 h-14 text-2xl shadow-lg flex items-center justify-center"
            title="Submit photo"
          >
            +
          </button>
          <button
            onClick={() => { setShowTeams(true); setShowForm(false) }}
            className="bg-white text-gray-700 rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-sm font-bold border"
            title="Filter teams"
          >
            &#9776;
          </button>
        </div>
        {showForm && (
          <div className="md:hidden fixed inset-0 z-[998] flex flex-col justify-end">
            <div className="bg-black/40 absolute inset-0" onClick={() => setShowForm(false)} />
            <div className="relative bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto shadow-2xl">
              <SubmissionForm onClose={() => setShowForm(false)} />
            </div>
          </div>
        )}
        {showTeams && (
          <div className="md:hidden fixed inset-0 z-[998] flex flex-col justify-end">
            <div className="bg-black/40 absolute inset-0" onClick={() => setShowTeams(false)} />
            <div className="relative bg-white rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto shadow-2xl">
              <TeamFilter />
            </div>
          </div>
        )}
      </div>
      <aside className="hidden md:flex md:flex-col md:w-80 bg-gray-50 border-l overflow-y-auto">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-gray-800">KGC Race Tracker</h1>
          <p className="text-xs text-gray-500">Kinetic Grand Championship 2026</p>
        </div>
        <div className="p-4 border-b">
          <SubmissionForm />
        </div>
        <div className="p-4">
          <TeamFilter />
        </div>
      </aside>
      <SubmissionModal />
    </div>
  )
}

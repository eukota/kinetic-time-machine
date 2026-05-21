import { useState, useEffect, useCallback, useRef } from 'react'
import { useStore, Submission } from '../store'
import { useTeams } from '../hooks/useTeams'
import { GalleryTile } from './GalleryTile'

const REFRESH_MS = 30_000

type SortMode = 'newest' | 'oldest' | 'team'

const SORT_LABELS: Record<SortMode, string> = {
  newest: '↓ Newest',
  oldest: '↑ Oldest',
  team: 'A→Z Team',
}
const SORT_CYCLE: SortMode[] = ['newest', 'oldest', 'team']

export const Gallery = () => {
  const { teams, selectSubmissionsAt } = useStore()
  useTeams()

  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [teamSearch, setTeamSearch] = useState('')
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const knownIdsRef = useRef<Set<string>>(new Set())

  const fetchSubmissions = useCallback(async () => {
    try {
      const r = await fetch('/api/submissions/')
      const data: Submission[] = await r.json()
      const withPhoto = data.filter((s) => s.first_photo)
      setAllSubmissions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id))
        const newOnes = withPhoto.filter((s) => !existingIds.has(s.id))
        return newOnes.length > 0 ? [...newOnes, ...prev] : prev.length === 0 ? withPhoto : prev
      })
      knownIdsRef.current = new Set(withPhoto.map((s) => s.id))
      setLastUpdated(new Date())
      setSecondsAgo(0)
    } catch (_) {}
  }, [])

  useEffect(() => {
    fetchSubmissions()
    const poll = setInterval(fetchSubmissions, REFRESH_MS)
    return () => clearInterval(poll)
  }, [fetchSubmissions])

  useEffect(() => {
    if (!lastUpdated) return
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 5000)
    return () => clearInterval(tick)
  }, [lastUpdated])

  const cycleSort = () => {
    setSortMode((m) => SORT_CYCLE[(SORT_CYCLE.indexOf(m) + 1) % SORT_CYCLE.length])
  }

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  )

  const filtered = allSubmissions
    .filter((s) => selectedTeamIds.size === 0 || (s.team_id && selectedTeamIds.has(s.team_id)))
    .sort((a, b) => {
      if (sortMode === 'newest') {
        return new Date(b.created_at || b.timestamp || 0).getTime() -
               new Date(a.created_at || a.timestamp || 0).getTime()
      }
      if (sortMode === 'oldest') {
        return new Date(a.created_at || a.timestamp || 0).getTime() -
               new Date(b.created_at || b.timestamp || 0).getTime()
      }
      const ta = teams.find((t) => t.id === a.team_id)?.name ?? ''
      const tb = teams.find((t) => t.id === b.team_id)?.name ?? ''
      return ta.localeCompare(tb)
    })

  const handleTileClick = (index: number) => {
    selectSubmissionsAt(filtered, index)
  }

  return (
    <div className="flex flex-col h-full text-white overflow-hidden" style={{ background: '#0a0a0a' }}>

      {/* Controls bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 flex-shrink-0">

        {/* Team filter */}
        <div className="relative">
          <button
            onClick={() => setShowTeamPanel((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded border transition-colors ${
              selectedTeamIds.size > 0
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10'
            }`}
          >
            {selectedTeamIds.size > 0
              ? `${selectedTeamIds.size} team${selectedTeamIds.size > 1 ? 's' : ''}`
              : 'All Teams'}
            {' ▾'}
          </button>

          {showTeamPanel && (
            <div className="absolute top-full left-0 mt-1 w-72 rounded-lg shadow-2xl z-50 border border-white/15" style={{ background: '#1a1a1a' }}>
              <div className="p-2 border-b border-white/10">
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search teams…"
                  className="w-full text-white text-sm rounded px-2 py-1 placeholder-white/30 outline-none border-0"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 px-3 py-1.5 text-xs border-b border-white/10">
                <button
                  onClick={() => setSelectedTeamIds(new Set(teams.map((t) => t.id)))}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Select all
                </button>
                <span className="text-white/20">·</span>
                <button
                  onClick={() => setSelectedTeamIds(new Set())}
                  className="text-white/50 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <ul className="max-h-60 overflow-y-auto py-1">
                {filteredTeams.map((t) => (
                  <li key={t.id}>
                    <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.has(t.id)}
                        onChange={() => toggleTeam(t.id)}
                        className="accent-blue-500"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate text-white/80">{t.name}</span>
                    </label>
                  </li>
                ))}
                {filteredTeams.length === 0 && (
                  <li className="px-3 py-2 text-white/30 text-sm italic">No matches</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Sort */}
        <button
          onClick={cycleSort}
          className="text-sm px-3 py-1.5 rounded border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
        >
          {SORT_LABELS[sortMode]}
        </button>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-2 text-xs text-white/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {lastUpdated
            ? secondsAgo < 10
              ? 'Just updated'
              : `Updated ${secondsAgo}s ago`
            : 'Loading…'}
        </div>
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-y-auto p-2"
        onClick={() => setShowTeamPanel(false)}
      >
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-white/40 text-sm text-center px-4 space-y-1">
            <p>No approved photos yet</p>
            <p className="text-xs text-white/30">Submissions appear here after a brief safety review.</p>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {filtered.map((s, i) => (
            <GalleryTile
              key={s.id}
              submission={s}
              team={teams.find((t) => t.id === s.team_id)}
              onClick={() => handleTileClick(i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

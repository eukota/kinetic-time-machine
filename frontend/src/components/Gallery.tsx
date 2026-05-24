import { useState, useEffect, useCallback } from 'react'
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
  const { teams, selectedYear, selectSubmissionsAt } = useStore()
  useTeams()

  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [teamSearch, setTeamSearch] = useState('')
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedYear !== null) params.set('year', String(selectedYear))
      const r = await fetch(`/api/submissions/${params.toString() ? `?${params}` : ''}`)
      const data: Submission[] = await r.json()
      const withPhoto = data.filter((s) => s.first_photo)
      setAllSubmissions(withPhoto)
      setLastUpdated(new Date())
      setSecondsAgo(0)
    } catch (_) {}
  }, [selectedYear])

  useEffect(() => {
    fetchSubmissions()
    const poll = setInterval(fetchSubmissions, REFRESH_MS)
    return () => clearInterval(poll)
  }, [fetchSubmissions])

  useEffect(() => {
    const onDeleted = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (id) setAllSubmissions((prev) => prev.filter((s) => s.id !== id))
    }
    window.addEventListener('ktm:submission-deleted', onDeleted)
    return () => window.removeEventListener('ktm:submission-deleted', onDeleted)
  }, [])

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
    <div
      data-component="gallery"
      data-component-version="1.0"
      data-component-category="content"
      data-entity-type="page"
      data-entity-id="page_gallery"
      className="flex flex-col h-full overflow-hidden bg-kinetic-navy bg-kinetic-dots bg-dots"
      onClick={() => setShowTeamPanel(false)}
    >

      <div className="flex items-center gap-3 px-4 py-3 border-b-4 border-kinetic-gold bg-kinetic-cream flex-shrink-0">
        <h2 className="kinetic-title text-xl hidden sm:block mr-2">📷 Gallery</h2>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowTeamPanel((v) => !v)}
            data-cta-action="toggle-team-filter"
            data-cta-label="Team filter"
            className={`text-sm px-3 py-1.5 rounded-lg border-2 font-bold transition-all ${
              selectedTeamIds.size > 0
                ? 'bg-kinetic-red text-white border-kinetic-navy shadow-kinetic-sm'
                : 'bg-white border-kinetic-navy/20 text-kinetic-navy hover:bg-kinetic-parchment'
            }`}
          >
            {selectedTeamIds.size > 0
              ? `${selectedTeamIds.size} team${selectedTeamIds.size > 1 ? 's' : ''}`
              : 'All Teams'}
            {' ▾'}
          </button>

          {showTeamPanel && (
            <div className="absolute top-full left-0 mt-1 w-72 rounded-xl shadow-kinetic z-50 border-2 border-kinetic-navy bg-kinetic-cream">
              <div className="p-2 border-b-2 border-kinetic-navy/10">
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search teams…"
                  className="kinetic-input"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 px-3 py-1.5 text-xs border-b-2 border-kinetic-navy/10 font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedTeamIds(new Set(teams.map((t) => t.id)))}
                  data-cta-action="select-all-teams"
                  data-cta-label="Select all teams"
                  className="text-kinetic-teal hover:text-kinetic-navy"
                >
                  Select all
                </button>
                <span className="text-kinetic-navy/20">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedTeamIds(new Set())}
                  data-cta-action="clear-team-filter"
                  data-cta-label="Clear team filter"
                  className="text-kinetic-navy/50 hover:text-kinetic-navy"
                >
                  Clear
                </button>
              </div>
              <ul className="max-h-60 overflow-y-auto py-1">
                {filteredTeams.map((t) => (
                  <li key={t.id}>
                    <label
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-kinetic-gold/20 cursor-pointer text-sm"
                      data-cta-action="toggle-team-filter"
                      data-cta-label={t.name}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeamIds.has(t.id)}
                        onChange={() => toggleTeam(t.id)}
                        className="accent-kinetic-red"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-kinetic-navy/20"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate text-kinetic-navy">{t.name}</span>
                    </label>
                  </li>
                ))}
                {filteredTeams.length === 0 && (
                  <li className="px-3 py-2 text-kinetic-navy/40 text-sm italic">No matches</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={cycleSort}
          data-cta-action="cycle-sort"
          data-cta-label={SORT_LABELS[sortMode]}
          className="text-sm px-3 py-1.5 rounded-lg border-2 border-kinetic-navy/20 bg-white text-kinetic-navy font-bold hover:bg-kinetic-parchment transition-colors"
        >
          {SORT_LABELS[sortMode]}
        </button>

        <div className="ml-auto flex items-center gap-2 text-xs font-bold text-kinetic-navy/50">
          <span className="w-2 h-2 rounded-full bg-kinetic-teal animate-pulse" />
          {lastUpdated
            ? secondsAgo < 10
              ? 'Just updated'
              : `Updated ${secondsAgo}s ago`
            : 'Loading…'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-kinetic-gold/70 text-sm text-center px-4 space-y-2">
            <p className="text-4xl" aria-hidden>🏜</p>
            <p className="font-bold">No approved photos yet</p>
            <p className="text-xs text-kinetic-gold/50">Submissions appear here after a brief safety review.</p>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((s, i) => (
            <GalleryTile
              key={s.id}
              index={i}
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

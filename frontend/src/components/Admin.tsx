import { useState, useEffect, useCallback } from 'react'
import { submissionDisplayDate } from '../lib/formatDate'
import { getAnalyticsDashboard } from '../lib/analyticsDashboard'
import { clearAdminToken, getAdminToken, setAdminToken } from '../lib/adminAuth'
import { clearAnalyticsUser, getAnalyticsUser } from '../lib/analyticsUser'
import { PhotoImg } from './PhotoImg'
import { SiteInfoPanel } from './SiteInfoPanel'

interface PendingSubmission {
  id: string
  latitude: number | null
  longitude: number | null
  timestamp: string | null
  team_id: string | null
  note: string | null
  created_at?: string
  first_photo: string | null
  first_photo_thumb: string | null
  first_photo_mime: string | null
  moderation_note?: string | null
}

interface TrackingRequest {
  id: string
  team_name: string
  email: string
  code: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

interface TeamWithToken {
  team_id: string
  team_name: string
  current_token: string | null
  token_generated_at: string | null
  last_token_used_at: string | null
  last_location_lat: number | null
  last_location_lon: number | null
}

export const Admin = () => {
  const [token, setToken] = useState<string>(() => getAdminToken() || '')
  const [analyticsUser, setAnalyticsUser] = useState<string | null>(() => getAnalyticsUser())
  const [tokenInput, setTokenInput] = useState('')
  const [pending, setPending] = useState<PendingSubmission[]>([])
  const [trackingRequests, setTrackingRequests] = useState<TrackingRequest[]>([])
  const [teamsWithTokens, setTeamsWithTokens] = useState<TeamWithToken[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showTokenValue, setShowTokenValue] = useState<{ [key: string]: boolean }>({})

  const fetchPending = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/submissions/pending', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.status === 401) {
        setError('Invalid token')
        clearAdminToken()
        setToken('')
        return
      }
      if (r.status === 503) {
        setError('Server has no ADMIN_TOKEN configured')
        return
      }
      if (!r.ok) {
        setError(`Request failed: ${r.status}`)
        return
      }
      setPending(await r.json())
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchTrackingRequests = useCallback(async () => {
    if (!token) return
    try {
      const r = await fetch('/api/admin/tracking-requests', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        setTrackingRequests(await r.json())
      }
    } catch (e: any) {
      console.error('Error fetching tracking requests:', e)
    }
  }, [token])

  const fetchTeamsWithTokens = useCallback(async () => {
    if (!token) return
    try {
      // Try to get all teams with token info
      const r = await fetch('/api/admin/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const teams = await r.json()
        setTeamsWithTokens(teams)
      } else if (r.status === 404) {
        // Fallback: get basic teams and fetch their token info
        const teamsR = await fetch('/api/teams/', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (teamsR.ok) {
          const teams = await teamsR.json()
          const teamsWithTokenInfo: TeamWithToken[] = []

          for (const team of teams) {
            try {
              const tokenR = await fetch(`/api/admin/teams/${team.id}/token`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (tokenR.ok) {
                const tokenInfo = await tokenR.json()
                if (tokenInfo.current_token) {
                  teamsWithTokenInfo.push(tokenInfo)
                }
              }
            } catch (e) {
              // Skip teams that can't be fetched
            }
          }

          setTeamsWithTokens(teamsWithTokenInfo)
        }
      }
    } catch (e: any) {
      console.error('Error fetching teams:', e)
    }
  }, [token])

  useEffect(() => {
    fetchPending()
    fetchTrackingRequests()
    fetchTeamsWithTokens()
    if (!token) return
    const poll = setInterval(() => {
      fetchPending()
      fetchTrackingRequests()
      fetchTeamsWithTokens()
    }, 15_000)
    return () => clearInterval(poll)
  }, [token, fetchPending, fetchTrackingRequests, fetchTeamsWithTokens])

  useEffect(() => {
    const onAnalyticsUserCleared = () => setAnalyticsUser(null)
    window.addEventListener('ktm:analytics-user-cleared', onAnalyticsUserCleared)
    return () => window.removeEventListener('ktm:analytics-user-cleared', onAnalyticsUserCleared)
  }, [])

  const signIn = (e: React.FormEvent) => {
    e.preventDefault()
    const t = tokenInput.trim()
    if (!t) return
    setAdminToken(t)
    setToken(t)
    setTokenInput('')
  }

  const signOut = () => {
    clearAdminToken()
    setToken('')
    setPending([])
  }

  const resetAnalyticsUser = () => {
    clearAnalyticsUser()
    setAnalyticsUser(null)
  }

  const act = async (id: string, kind: 'approve' | 'reject') => {
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      const url = kind === 'approve'
        ? `/api/admin/submissions/${id}/approve`
        : `/api/admin/submissions/${id}`
      const r = await fetch(url, {
        method: kind === 'approve' ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        setPending((prev) => prev.filter((s) => s.id !== id))
      }
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  const approveTrackingRequest = async (id: string) => {
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      const r = await fetch(`/api/admin/tracking-request/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const data = await r.json()
        setTrackingRequests((prev) => prev.filter((tr) => tr.id !== id))
        setSuccessMessage(`Approved request for ${data.team_id}. Token generated.`)
        setTimeout(() => setSuccessMessage(null), 3000)
        // Refresh teams with tokens
        fetchTeamsWithTokens()
      }
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  const rejectTrackingRequest = async (id: string) => {
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      const r = await fetch(`/api/admin/tracking-request/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        setTrackingRequests((prev) => prev.filter((tr) => tr.id !== id))
        setSuccessMessage('Request rejected.')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  const resetTeamToken = async (teamId: string) => {
    setBusyIds((prev) => new Set(prev).add(teamId))
    try {
      const r = await fetch(`/api/admin/teams/${teamId}/token/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        const data = await r.json()
        setTeamsWithTokens((prev) => prev.map((t) => t.team_id === teamId ? { ...t, current_token: data.token } : t))
        setShowTokenValue({ ...showTokenValue, [teamId]: true })
        setSuccessMessage('Token reset. New token generated.')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(teamId); return n })
    }
  }

  const disableTeamToken = async (teamId: string) => {
    setBusyIds((prev) => new Set(prev).add(teamId))
    try {
      const r = await fetch(`/api/admin/teams/${teamId}/token/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) {
        setTeamsWithTokens((prev) => prev.map((t) => t.team_id === teamId ? { ...t, current_token: null } : t))
        setSuccessMessage('Token disabled.')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(teamId); return n })
    }
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setSuccessMessage('Token copied to clipboard!')
    setTimeout(() => setSuccessMessage(null), 2000)
  }

  const analyticsDashboard = getAnalyticsDashboard()

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center bg-kinetic-navy bg-kinetic-dots bg-dots">
        <form onSubmit={signIn} className="kinetic-panel p-6 w-80 space-y-4">
          <h2 className="kinetic-title text-2xl">🔒 Admin</h2>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="kinetic-input"
            autoFocus
          />
          {error && <p className="text-sm text-kinetic-red font-bold">{error}</p>}
          {analyticsUser && (
            <p className="text-xs text-kinetic-cream/60">
              Analytics tag: <span className="font-mono text-kinetic-gold">{analyticsUser}</span>
              {' · '}
              <button
                type="button"
                onClick={resetAnalyticsUser}
                className="font-bold text-kinetic-gold/80 hover:text-kinetic-gold underline-offset-2 hover:underline"
              >
                Clear tag
              </button>
            </p>
          )}
          <button type="submit" className="kinetic-btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div
      data-component="admin-panel"
      data-component-version="1.0"
      data-component-category="admin"
      data-entity-type="page"
      data-entity-id="page_admin"
      className="flex-1 flex flex-col bg-kinetic-navy bg-kinetic-dots bg-dots overflow-hidden"
    >

      <div className="flex items-center gap-3 px-4 py-3 border-b-4 border-kinetic-gold bg-kinetic-cream flex-shrink-0 text-sm">
        <span className="kinetic-title text-lg">Pending Review</span>
        <span className="kinetic-badge">{pending.length} item{pending.length === 1 ? '' : 's'}</span>
        {loading && <span className="text-kinetic-navy/40 text-xs font-bold">refreshing…</span>}
        <a
          href={analyticsDashboard.url}
          target="_blank"
          rel="noopener noreferrer"
          data-cta-action="open-analytics-dashboard"
          data-cta-label={analyticsDashboard.label}
          className="ml-auto text-xs font-bold text-kinetic-teal hover:text-kinetic-navy underline-offset-2 hover:underline"
        >
          {analyticsDashboard.label} ↗
        </a>
        <button onClick={fetchPending} className="text-xs font-bold text-kinetic-teal hover:text-kinetic-navy">Refresh</button>
        {analyticsUser && (
          <button
            type="button"
            onClick={resetAnalyticsUser}
            className="text-xs font-bold text-kinetic-navy/40 hover:text-kinetic-orange"
            title={`Stop tagging analytics as "${analyticsUser}"`}
          >
            Clear user tag ({analyticsUser})
          </button>
        )}
        <button onClick={signOut} className="text-xs font-bold text-kinetic-navy/40 hover:text-kinetic-red">Sign out</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {error && <p className="text-kinetic-gold font-bold text-sm">{error}</p>}
        {successMessage && <p className="text-kinetic-teal font-bold text-sm bg-kinetic-teal/10 border-2 border-kinetic-teal rounded-lg px-3 py-2">{successMessage}</p>}

        {/* Tracking Requests Section */}
        <div className="kinetic-panel p-4">
          <h3 className="kinetic-title text-lg mb-4">Tracking Requests</h3>
          {trackingRequests.length === 0 ? (
            <p className="text-kinetic-navy/50 font-bold text-sm text-center py-6">No pending requests</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-kinetic-navy/30">
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Team Name</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Email</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Code</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Status</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingRequests.map((tr) => {
                    const busy = busyIds.has(tr.id)
                    return (
                      <tr key={tr.id} className="border-b border-kinetic-navy/10 hover:bg-kinetic-cream/20">
                        <td className="px-3 py-2 text-kinetic-navy">{tr.team_name}</td>
                        <td className="px-3 py-2 text-kinetic-navy/70 text-xs font-mono">{tr.email}</td>
                        <td className="px-3 py-2 text-kinetic-navy font-bold">{tr.code}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${tr.status === 'pending' ? 'bg-kinetic-gold/70' : tr.status === 'approved' ? 'bg-kinetic-teal' : 'bg-kinetic-red'}`}>
                            {tr.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {tr.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => approveTrackingRequest(tr.id)}
                                disabled={busy}
                                className="text-xs font-bold px-2 py-1 rounded bg-kinetic-teal text-white hover:bg-kinetic-teal/80 disabled:opacity-50"
                                title="Approve this request"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => rejectTrackingRequest(tr.id)}
                                disabled={busy}
                                className="text-xs font-bold px-2 py-1 rounded bg-kinetic-red text-white hover:bg-kinetic-red/80 disabled:opacity-50"
                                title="Reject this request"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Token Management Section */}
        <div className="kinetic-panel p-4">
          <h3 className="kinetic-title text-lg mb-4">Token Management</h3>
          {teamsWithTokens.length === 0 ? (
            <p className="text-kinetic-navy/50 font-bold text-sm text-center py-6">No teams with tokens</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-kinetic-navy/30">
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Team Name</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Token</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Last Used</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Last Location</th>
                    <th className="text-left px-3 py-2 font-bold text-kinetic-navy">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamsWithTokens.map((team) => {
                    const busy = busyIds.has(team.team_id)
                    const showToken = showTokenValue[team.team_id]
                    return (
                      <tr key={team.team_id} className="border-b border-kinetic-navy/10 hover:bg-kinetic-cream/20">
                        <td className="px-3 py-2 text-kinetic-navy">{team.team_name}</td>
                        <td className="px-3 py-2">
                          {team.current_token ? (
                            <div className="flex items-center gap-2">
                              <code className="text-[10px] font-mono bg-kinetic-navy/10 px-2 py-1 rounded">
                                {showToken ? team.current_token : '••••••••' + team.current_token.slice(-8)}
                              </code>
                              <button
                                onClick={() => copyToken(team.current_token!)}
                                className="text-xs font-bold px-1.5 py-0.5 rounded bg-kinetic-gold/50 hover:bg-kinetic-gold text-kinetic-navy"
                                title="Copy token"
                              >
                                📋
                              </button>
                            </div>
                          ) : (
                            <span className="text-kinetic-navy/40 italic">disabled</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-kinetic-navy/70 text-xs">
                          {team.last_token_used_at ? new Date(team.last_token_used_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-kinetic-navy/70 text-xs font-mono">
                          {team.last_location_lat != null ? `${team.last_location_lat.toFixed(3)}, ${team.last_location_lon!.toFixed(3)}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => resetTeamToken(team.team_id)}
                              disabled={busy}
                              className="text-xs font-bold px-2 py-1 rounded bg-kinetic-orange text-white hover:bg-kinetic-orange/80 disabled:opacity-50"
                              title="Generate new token"
                            >
                              🔄
                            </button>
                            <button
                              onClick={() => disableTeamToken(team.team_id)}
                              disabled={busy}
                              className="text-xs font-bold px-2 py-1 rounded bg-kinetic-red text-white hover:bg-kinetic-red/80 disabled:opacity-50"
                              title="Disable token"
                            >
                              🚫
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Photo Submissions Section */}
        <div>
          <h3 className="kinetic-title text-lg mb-4 px-3">📸 Photos Pending Review</h3>
          {pending.length === 0 && !loading && (
            <p className="text-kinetic-gold/50 font-bold text-sm text-center py-12">No pending submissions — all clear!</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-3">
            {pending.map((s) => {
              const busy = busyIds.has(s.id)
              return (
                <div key={s.id} className="kinetic-panel overflow-hidden !rounded-lg">
                  {s.first_photo && (
                    <PhotoImg
                      primarySrc={`/photos/${s.first_photo_thumb ?? s.first_photo}`}
                      fallbackSrc={`/photos/${s.first_photo}`}
                      alt="pending"
                      className="w-full aspect-square object-cover border-b-2 border-kinetic-navy"
                    />
                  )}
                  <div className="p-3 text-xs space-y-1 text-kinetic-navy/80">
                    {submissionDisplayDate(s) && (
                      <p className="font-bold tabular-nums">{submissionDisplayDate(s)}</p>
                    )}
                    {s.latitude != null && <p className="text-kinetic-navy/50">{s.latitude.toFixed(5)}, {s.longitude!.toFixed(5)}</p>}
                    {s.note && <p className="italic text-kinetic-navy/60">"{s.note}"</p>}
                    {s.moderation_note && (
                      <p className="text-kinetic-teal/80 text-[10px] leading-snug">{s.moderation_note}</p>
                    )}
                    {s.first_photo_mime && <p className="text-kinetic-navy/30">{s.first_photo_mime}</p>}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => act(s.id, 'approve')}
                        disabled={busy}
                        data-cta-action="approve-submission"
                        data-cta-label="Approve"
                        data-entity-type="content"
                        data-entity-id={`sub_${s.id}`}
                        className="flex-1 bg-kinetic-teal text-white border-2 border-kinetic-navy font-bold hover:bg-kinetic-teal/80 disabled:opacity-50 py-1.5 rounded-lg text-xs shadow-kinetic-sm"
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => act(s.id, 'reject')}
                        disabled={busy}
                        data-cta-action="reject-submission"
                        data-cta-label="Reject"
                        data-entity-type="content"
                        data-entity-id={`sub_${s.id}`}
                        className="flex-1 bg-kinetic-red text-white border-2 border-kinetic-navy font-bold hover:bg-kinetic-orange disabled:opacity-50 py-1.5 rounded-lg text-xs shadow-kinetic-sm"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <SiteInfoPanel token={token} />
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { submissionDisplayDate } from '../lib/formatDate'
import { getAnalyticsDashboard } from '../lib/analyticsDashboard'

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

const TOKEN_KEY = 'ktm.admin.token'

export const Admin = () => {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '')
  const [tokenInput, setTokenInput] = useState('')
  const [pending, setPending] = useState<PendingSubmission[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

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
        localStorage.removeItem(TOKEN_KEY)
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

  useEffect(() => {
    fetchPending()
    if (!token) return
    const poll = setInterval(fetchPending, 15_000)
    return () => clearInterval(poll)
  }, [token, fetchPending])

  const signIn = (e: React.FormEvent) => {
    e.preventDefault()
    const t = tokenInput.trim()
    if (!t) return
    localStorage.setItem(TOKEN_KEY, t)
    setToken(t)
    setTokenInput('')
  }

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setPending([])
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
        <button onClick={signOut} className="text-xs font-bold text-kinetic-navy/40 hover:text-kinetic-red">Sign out</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {error && <p className="text-kinetic-gold font-bold text-sm mb-3">{error}</p>}
        {pending.length === 0 && !loading && (
          <p className="text-kinetic-gold/50 font-bold text-sm text-center py-12">No pending submissions — all clear!</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pending.map((s) => {
            const busy = busyIds.has(s.id)
            return (
              <div key={s.id} className="kinetic-panel overflow-hidden !rounded-lg">
                {s.first_photo && (
                  <img
                    src={`/photos/${s.first_photo_thumb ?? s.first_photo}`}
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
    </div>
  )
}

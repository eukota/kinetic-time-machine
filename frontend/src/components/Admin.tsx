import { useState, useEffect, useCallback } from 'react'
import { trackEvent } from '../lib/analytics'

interface PendingSubmission {
  id: string
  latitude: number | null
  longitude: number | null
  timestamp: string | null
  team_id: string | null
  note: string | null
  created_at?: string
  first_photo: string | null
  first_photo_mime: string | null
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
        trackEvent(kind === 'approve' ? 'admin-approve' : 'admin-reject', { submission_id: id })
        setPending((prev) => prev.filter((s) => s.id !== id))
      }
    } finally {
      setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-white">
        <form onSubmit={signIn} className="bg-gray-900 border border-white/10 rounded-lg p-6 w-80 space-y-4">
          <h2 className="text-lg font-bold">Admin sign-in</h2>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="w-full bg-white/5 border border-white/15 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
            autoFocus
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm font-medium">
            Sign in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 text-white overflow-hidden">

      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 flex-shrink-0 text-sm">
        <span className="font-medium">Pending review</span>
        <span className="text-white/40">{pending.length} item{pending.length === 1 ? '' : 's'}</span>
        {loading && <span className="text-white/30 text-xs">refreshing…</span>}
        <button onClick={fetchPending} className="ml-auto text-xs text-white/50 hover:text-white">Refresh</button>
        <button onClick={signOut} className="text-xs text-white/40 hover:text-red-300">Sign out</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {pending.length === 0 && !loading && (
          <p className="text-white/30 text-sm text-center py-12">No pending submissions.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pending.map((s) => {
            const busy = busyIds.has(s.id)
            return (
              <div key={s.id} className="bg-gray-900 border border-white/10 rounded overflow-hidden">
                {s.first_photo && (
                  <img src={`/photos/${s.first_photo}`} alt="pending" className="w-full aspect-square object-cover" />
                )}
                <div className="p-3 text-xs space-y-1 text-white/70">
                  {s.timestamp && <p>{new Date(s.timestamp).toLocaleString()}</p>}
                  {s.latitude != null && <p className="text-white/40">{s.latitude.toFixed(5)}, {s.longitude!.toFixed(5)}</p>}
                  {s.note && <p className="italic text-white/60">"{s.note}"</p>}
                  {s.first_photo_mime && <p className="text-white/30">{s.first_photo_mime}</p>}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => act(s.id, 'approve')}
                      disabled={busy}
                      className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 py-1.5 rounded text-xs font-medium"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => act(s.id, 'reject')}
                      disabled={busy}
                      className="flex-1 bg-red-900 hover:bg-red-800 disabled:opacity-50 py-1.5 rounded text-xs font-medium"
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

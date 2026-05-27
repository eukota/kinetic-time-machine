import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore, Submission } from '../store'
import { useSubmissions } from '../hooks/useSubmissions'
import { useTeams } from '../hooks/useTeams'
import { submissionDisplayDate } from '../lib/formatDate'
import { getAdminToken, isAdminSignedIn } from '../lib/adminAuth'
import { ZoomableImage } from './ZoomableImage'
import { TeamPicker } from './TeamPicker'

interface DetailPhoto {
  id: string
  file_path: string
  thumb_path?: string | null
  display_path?: string | null
  medium_path?: string | null
  mime_type: string | null
  uploaded_at: string
}

interface Detail extends Submission {
  photos?: DetailPhoto[]
}

export const SubmissionModal = () => {
  const {
    selectedSubmission, selectSubmission,
    selectedSubmissions, selectSubmissions,
    setSubmissions, submissions, teams,
    initialIndex,
  } = useStore()
  const { getSubmissionDetails } = useSubmissions()
  useTeams()

  const isOpen = selectedSubmission !== null || selectedSubmissions.length > 0
  const items: Submission[] = selectedSubmission ? [selectedSubmission] : selectedSubmissions

  const [isAdmin, setIsAdmin] = useState(() => isAdminSignedIn())

  const [index, setIndex] = useState(0)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [editTeamId, setEditTeamId] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editAttribution, setEditAttribution] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const close = useCallback(() => {
    selectSubmission(null)
    selectSubmissions([])
    setIndex(0)
    setDetail(null)
  }, [selectSubmission, selectSubmissions])

  useEffect(() => { if (isOpen) setIndex(initialIndex) }, [isOpen, initialIndex])

  useEffect(() => {
    if (isOpen) setIsAdmin(isAdminSignedIn())
  }, [isOpen])

  useEffect(() => {
    const syncAdmin = () => setIsAdmin(isAdminSignedIn())
    window.addEventListener('ktm:admin-signed-in', syncAdmin)
    window.addEventListener('ktm:admin-signed-out', syncAdmin)
    return () => {
      window.removeEventListener('ktm:admin-signed-in', syncAdmin)
      window.removeEventListener('ktm:admin-signed-out', syncAdmin)
    }
  }, [])

  const activeId = items[index]?.id

  useEffect(() => {
    if (!isOpen || !activeId) {
      setDetail(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getSubmissionDetails(activeId)
      .then((d) => {
        if (cancelled) return
        setDetail(d as Detail)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [isOpen, activeId, getSubmissionDetails])

  const activeSubmission = (detail?.id === activeId ? detail : null) ?? items[index]

  useEffect(() => {
    if (!activeSubmission) return
    setEditTeamId(activeSubmission.team_id ?? '')
    setEditNote(activeSubmission.note ?? '')
    setEditAttribution(activeSubmission.attribution ?? '')
    setSaveMsg(null)
  }, [activeId, activeSubmission?.team_id, activeSubmission?.note, activeSubmission?.attribution, activeSubmission?.id])

  const applySubmissionUpdate = useCallback((id: string, updates: Partial<Submission>) => {
    setSubmissions(submissions.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    if (selectedSubmission?.id === id) {
      selectSubmission({ ...selectedSubmission, ...updates })
    }
    if (selectedSubmissions.length > 0) {
      selectSubmissions(selectedSubmissions.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    }
    setDetail((d) => (d?.id === id ? { ...d, ...updates } : d))
  }, [submissions, selectedSubmission, selectedSubmissions, selectSubmission, selectSubmissions, setSubmissions])

  const handleSaveMeta = async () => {
    if (!activeSubmission) return
    const token = getAdminToken()
    if (!token) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const r = await fetch(`/api/admin/submissions/${activeSubmission.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: editTeamId || '',
          note: editNote,
          attribution: editAttribution,
        }),
      })
      if (!r.ok) {
        const msg = r.status === 401
          ? 'Invalid admin token — sign in again.'
          : `Save failed (${r.status})`
        setSaveMsg(msg)
        return
      }
      const updated = await r.json()
      applySubmissionUpdate(activeSubmission.id, {
        team_id: updated.team_id,
        note: updated.note,
      })
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(null), 2500)
    } finally {
      setSaving(false)
    }
  }

  const prev = useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length])
  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, close, prev, next])

  const handleDelete = async () => {
    if (!detail || !confirm('Delete this submission and its photos?')) return
    const token = getAdminToken()
    if (!token) {
      alert('Sign in on the Admin tab first — delete requires an admin token.')
      return
    }
    const r = await fetch(`/api/admin/submissions/${detail.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) {
      const msg = r.status === 503
        ? 'Delete unavailable — server has no ADMIN_TOKEN configured.'
        : r.status === 401
          ? 'Invalid admin token — sign in again on the Admin tab.'
          : `Delete failed (${r.status})`
      alert(msg)
      return
    }
    setSubmissions(submissions.filter((s) => s.id !== detail.id))
    window.dispatchEvent(new CustomEvent('ktm:submission-deleted', { detail: { id: detail.id } }))
    const remaining = items.filter((s) => s.id !== detail.id)
    if (remaining.length === 0) { close(); return }
    selectSubmissions(remaining)
    setIndex(Math.min(index, remaining.length - 1))
  }

  if (!isOpen) return null

  const current = items[index]
  const detailPhoto = detail?.id === current?.id ? detail?.photos?.[0] : undefined
  const listPhoto = current?.first_photo
    ? {
        file_path: current.first_photo,
        thumb_path: current.first_photo_thumb,
        display_path: current.first_photo_display,
        medium_path: current.first_photo_medium,
      }
    : undefined
  const photo = detailPhoto ?? listPhoto
  const teamName = activeSubmission?.team_id
    ? teams.find((t) => t.id === activeSubmission.team_id)?.name
    : null
  const displayDate = submissionDisplayDate(activeSubmission ?? {})
  const multi = items.length > 1

  const photoSrc = (() => {
    if (!photo) return null
    const isWide = typeof window !== 'undefined' && window.matchMedia('(min-width: 641px)').matches
    const path = isWide
      ? (photo.medium_path ?? photo.display_path ?? photo.thumb_path ?? photo.file_path)
      : (photo.display_path ?? photo.thumb_path ?? photo.medium_path ?? photo.file_path)
    return `/photos/${path}`
  })()

  return createPortal(
    <div
      data-component="submission-modal"
      data-component-version="1.0"
      data-component-category="content"
      data-entity-type="content"
      data-entity-id={current ? `sub_${current.id}` : 'sub_unknown'}
      data-analytics-impression-dwell="300"
      className="kinetic-modal-overlay"
      onClick={close}
    >
      <div className="h-1 flex-shrink-0 bg-kinetic-stripes" aria-hidden />

      <div className="kinetic-modal-header" onClick={(e) => e.stopPropagation()}>
        {multi ? (
          <span className="kinetic-modal-counter">{index + 1} / {items.length}</span>
        ) : (
          <span className="font-display text-kinetic-gold text-lg tracking-wide">Race Photo</span>
        )}
        <button type="button" onClick={close} className="kinetic-modal-close" aria-label="Close">✕</button>
      </div>

      <div className="flex-1 flex items-stretch min-h-0 min-w-0 relative" onClick={(e) => e.stopPropagation()}>

        <button
          type="button"
          onClick={prev}
          data-cta-action="photo-prev"
          data-cta-label="Previous photo"
          className={`kinetic-modal-arrow ml-2 self-center hidden sm:flex ${!multi ? 'invisible' : ''}`}
        >
          ‹
        </button>

        <div className="flex-1 flex items-center justify-center min-w-0 min-h-0 p-0 sm:p-2">
          {photoSrc ? (
            <ZoomableImage
              src={photoSrc}
              fallbackSrc={photo?.file_path ? `/photos/${photo.file_path}` : undefined}
              alt="submission"
              onSwipeLeft={multi ? next : undefined}
              onSwipeRight={multi ? prev : undefined}
            />
          ) : loading ? (
            <div className="kinetic-loading">Loading photo…</div>
          ) : null}
          {!loading && !photo && current?.pending_review && (
            <div className="kinetic-callout-pending space-y-2">
              <div className="text-3xl" aria-hidden>🕒</div>
              <p className="font-display text-xl text-kinetic-navy">Pending approval</p>
              <p className="text-kinetic-navy/70 text-sm leading-relaxed">
                Your photo was submitted successfully. It'll appear here for everyone
                once it passes a quick safety review.
              </p>
            </div>
          )}
          {!loading && !photo && !current?.pending_review && (
            <div className="kinetic-loading">No photo</div>
          )}
        </div>

        <button
          type="button"
          onClick={next}
          data-cta-action="photo-next"
          data-cta-label="Next photo"
          className={`kinetic-modal-arrow mr-2 self-center hidden sm:flex ${!multi ? 'invisible' : ''}`}
        >
          ›
        </button>
      </div>

      <div className="kinetic-modal-footer" onClick={(e) => e.stopPropagation()}>
        {!isAdmin && teamName && (
          <p className="font-display text-lg text-kinetic-navy">{teamName}</p>
        )}
        {displayDate && (
          <p className="text-kinetic-navy/70 font-semibold tabular-nums">{displayDate}</p>
        )}
        {activeSubmission?.latitude != null && (
          <p className="text-kinetic-navy/50 text-xs tabular-nums">
            {activeSubmission.latitude.toFixed(5)}, {activeSubmission.longitude!.toFixed(5)}
          </p>
        )}
        {!isAdmin && activeSubmission?.note && (
          <p className="text-kinetic-navy/70 italic">{activeSubmission.note}</p>
        )}
        {activeSubmission?.attribution && (
          <p className="text-kinetic-navy/50 text-xs">📷 {activeSubmission.attribution}</p>
        )}
        {photo?.mime_type && <p className="text-kinetic-navy/40 text-xs">{photo.mime_type}</p>}

        {isAdmin && activeSubmission && (
          <div className="mt-2 pt-3 border-t-2 border-kinetic-navy/10 space-y-3">
            <p className="kinetic-sidebar-heading !mb-0">Admin edit</p>
            <div>
              <label className="block text-xs font-bold text-kinetic-navy/70 mb-1">Team</label>
              <TeamPicker teams={teams} value={editTeamId} onChange={setEditTeamId} />
            </div>
            <div>
              <label className="block text-xs font-bold text-kinetic-navy/70 mb-1">Caption</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={2}
                className="kinetic-input"
                placeholder="Photo caption…"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-kinetic-navy/70 mb-1">Attribution</label>
              <input
                type="text"
                value={editAttribution}
                onChange={(e) => setEditAttribution(e.target.value)}
                className="kinetic-input"
                placeholder="e.g. @username on Instagram"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveMeta}
                disabled={saving}
                className="kinetic-btn-secondary !py-1.5 !px-3 text-sm"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saveMsg && (
                <span className={`text-xs font-bold ${saveMsg === 'Saved' ? 'text-kinetic-teal' : 'text-kinetic-red'}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {multi && items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={i === index ? 'kinetic-dot-active' : 'kinetic-dot-inactive'}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-kinetic-red font-bold hover:text-kinetic-orange transition-colors"
            title={isAdminSignedIn() ? 'Delete submission' : 'Requires Admin sign-in'}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

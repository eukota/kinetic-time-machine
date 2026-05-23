import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore, Submission } from '../store'
import { useSubmissions } from '../hooks/useSubmissions'

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

const ADMIN_TOKEN_KEY = 'ktm.admin.token'

export const SubmissionModal = () => {
  const {
    selectedSubmission, selectSubmission,
    selectedSubmissions, selectSubmissions,
    setSubmissions, submissions, teams,
    initialIndex,
  } = useStore()
  const { getSubmissionDetails } = useSubmissions()

  const isOpen = selectedSubmission !== null || selectedSubmissions.length > 0
  const items: Submission[] = selectedSubmission ? [selectedSubmission] : selectedSubmissions

  const [index, setIndex] = useState(0)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)

  const close = useCallback(() => {
    selectSubmission(null)
    selectSubmissions([])
    setIndex(0)
    setDetail(null)
  }, [selectSubmission, selectSubmissions])

  useEffect(() => { if (isOpen) setIndex(initialIndex) }, [isOpen, initialIndex])

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
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
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
  const teamName = current?.team_id ? teams.find((t) => t.id === current.team_id)?.name : null
  const multi = items.length > 1

  const renderPhoto = () => {
    if (!photo) return null
    const isWide = typeof window !== 'undefined' && window.matchMedia('(min-width: 641px)').matches
    const src = isWide
      ? (photo.medium_path ?? photo.display_path ?? photo.thumb_path ?? photo.file_path)
      : (photo.display_path ?? photo.thumb_path ?? photo.medium_path ?? photo.file_path)

    return (
      <img
        key={`${current?.id}-${src}`}
        src={`/photos/${src}`}
        alt="submission"
        className="max-w-full max-h-full object-contain rounded-lg border-2 border-kinetic-gold/30 shadow-kinetic"
        decoding="async"
      />
    )
  }

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

      <div className="flex-1 flex items-stretch min-h-0 relative" onClick={(e) => e.stopPropagation()}>

        <button
          type="button"
          onClick={prev}
          data-cta-action="photo-prev"
          data-cta-label="Previous photo"
          className={`kinetic-modal-arrow ml-2 self-center ${!multi ? 'invisible' : ''}`}
        >
          ‹
        </button>

        <div className="flex-1 flex items-center justify-center min-w-0 p-2">
          {photo ? renderPhoto() : loading ? (
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
          className={`kinetic-modal-arrow mr-2 self-center ${!multi ? 'invisible' : ''}`}
        >
          ›
        </button>
      </div>

      <div className="kinetic-modal-footer" onClick={(e) => e.stopPropagation()}>
        {teamName && <p className="font-display text-lg text-kinetic-navy">{teamName}</p>}
        {current?.timestamp && (
          <p className="text-kinetic-navy/70 font-semibold">{new Date(current.timestamp).toLocaleString()}</p>
        )}
        {current?.latitude != null && (
          <p className="text-kinetic-navy/50 text-xs">{current.latitude.toFixed(5)}, {current.longitude!.toFixed(5)}</p>
        )}
        {current?.note && <p className="text-kinetic-navy/70 italic">{current.note}</p>}
        {photo?.mime_type && <p className="text-kinetic-navy/40 text-xs">{photo.mime_type}</p>}

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
            title={localStorage.getItem(ADMIN_TOKEN_KEY) ? 'Delete submission' : 'Requires Admin sign-in'}
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

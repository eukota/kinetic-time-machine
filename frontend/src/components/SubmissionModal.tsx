import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore, Submission } from '../store'
import { useSubmissions } from '../hooks/useSubmissions'

interface DetailPhoto {
  id: string
  file_path: string
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

  useEffect(() => {
    if (!isOpen || items.length === 0) return
    const item = items[index]
    if (!item) return
    setDetail(null)
    setLoading(true)
    getSubmissionDetails(item.id).then((d) => {
      setDetail(d as Detail)
      setLoading(false)
    })
  }, [index, isOpen])

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
    const r = await fetch(`/api/submissions/${detail.id}`, { method: 'DELETE' })
    if (!r.ok) return
    setSubmissions(submissions.filter((s) => s.id !== detail.id))
    const remaining = items.filter((s) => s.id !== detail.id)
    if (remaining.length === 0) { close(); return }
    selectSubmissions(remaining)
    setIndex(Math.min(index, remaining.length - 1))
  }

  if (!isOpen) return null

  const current = items[index]
  // Portal renders into document.body — escapes any parent stacking context
  const photo = detail?.photos?.[0]
  const teamName = current?.team_id ? teams.find((t) => t.id === current.team_id)?.name : null
  const multi = items.length > 1

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col select-none" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }} onClick={close}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-white/50 text-sm">{multi ? `${index + 1} / ${items.length}` : ''}</span>
        <button onClick={close} className="text-white/70 hover:text-white text-2xl w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">✕</button>
      </div>

      {/* Image + side arrows */}
      <div className="flex-1 flex items-stretch min-h-0 relative" onClick={(e) => e.stopPropagation()}>

        {/* Left arrow */}
        <button
          onClick={prev}
          className={`flex-shrink-0 w-14 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors text-4xl ${!multi ? 'invisible' : ''}`}
        >
          ‹
        </button>

        {/* Photo */}
        <div className="flex-1 flex items-center justify-center min-w-0 py-2">
          {loading && <div className="text-white/30 text-sm">Loading…</div>}
          {!loading && photo && (
            <img
              src={`/photos/${photo.file_path}`}
              alt="submission"
              className="max-w-full max-h-full object-contain rounded-sm"
            />
          )}
          {!loading && !photo && current?.pending_review && (
            <div className="max-w-sm mx-6 px-6 py-8 border border-yellow-400/30 bg-yellow-500/5 rounded-lg text-center space-y-2">
              <div className="text-3xl" aria-hidden>🕒</div>
              <p className="text-yellow-200 font-medium text-base">Pending approval</p>
              <p className="text-yellow-100/60 text-sm leading-relaxed">
                Your photo was submitted successfully. It'll appear here for everyone
                once it passes a quick safety review.
              </p>
            </div>
          )}
          {!loading && !photo && !current?.pending_review && (
            <div className="text-white/30 text-sm">No photo</div>
          )}
        </div>

        {/* Right arrow */}
        <button
          onClick={next}
          className={`flex-shrink-0 w-14 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors text-4xl ${!multi ? 'invisible' : ''}`}
        >
          ›
        </button>
      </div>

      {/* Footer metadata */}
      <div className="flex-shrink-0 px-4 py-3 text-sm space-y-0.5" onClick={(e) => e.stopPropagation()}>
        {teamName && <p className="text-white font-medium">{teamName}</p>}
        {current?.timestamp && <p className="text-white/60">{new Date(current.timestamp).toLocaleString()}</p>}
        {current?.latitude != null && <p className="text-white/40 text-xs">{current.latitude.toFixed(5)}, {current.longitude.toFixed(5)}</p>}
        {current?.note && <p className="text-white/60 italic">{current.note}</p>}
        {photo?.mime_type && <p className="text-white/30 text-xs">{photo.mime_type}</p>}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1.5">
            {multi && items.map((_, i) => (
              <button key={i} onClick={() => setIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/25'}`}
              />
            ))}
          </div>
          <button onClick={handleDelete} className="text-xs text-red-400/70 hover:text-red-300">Delete</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

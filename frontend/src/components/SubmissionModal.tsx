import { useEffect, useState } from 'react'
import { useStore, Submission } from '../store'
import { useSubmissions } from '../hooks/useSubmissions'

interface DetailedSubmission extends Submission {
  photos?: { id: string; file_path: string; mime_type: string | null; uploaded_at: string }[]
}

const SubmissionCard = ({
  submission,
  onDelete,
}: {
  submission: DetailedSubmission
  onDelete: (id: string) => void
}) => {
  const { getSubmissionDetails } = useSubmissions()
  const [details, setDetails] = useState<DetailedSubmission | null>(null)

  useEffect(() => {
    getSubmissionDetails(submission.id).then((d) => setDetails(d as DetailedSubmission))
  }, [submission.id])

  const handleDelete = async () => {
    if (!confirm('Delete this submission and its photos?')) return
    const r = await fetch(`/api/submissions/${submission.id}`, { method: 'DELETE' })
    if (r.ok) onDelete(submission.id)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {details?.photos?.map((photo) => (
        <img
          key={photo.id}
          src={`/photos/${photo.file_path}`}
          alt="submission"
          className="w-full object-contain max-h-72"
        />
      ))}
      <div className="p-3 text-sm text-gray-600 space-y-1">
        {submission.latitude != null && submission.longitude != null && (
          <p><span className="font-medium">Location:</span> {submission.latitude.toFixed(5)}, {submission.longitude.toFixed(5)}</p>
        )}
        {submission.timestamp && (
          <p><span className="font-medium">Time:</span> {new Date(submission.timestamp).toLocaleString()}</p>
        )}
        {submission.note && (
          <p><span className="font-medium">Note:</span> {submission.note}</p>
        )}
        {details?.photos?.[0]?.mime_type && (
          <p className="text-xs text-gray-400">Format: {details.photos[0].mime_type}</p>
        )}
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-600 pt-1"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export const SubmissionModal = () => {
  const { selectedSubmission, selectSubmission, selectedSubmissions, selectSubmissions, setSubmissions, submissions } = useStore()

  const isOpen = selectedSubmission !== null || selectedSubmissions.length > 0

  const close = () => {
    selectSubmission(null)
    selectSubmissions([])
  }

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen])

  if (!isOpen) return null

  const items: Submission[] = selectedSubmission ? [selectedSubmission] : selectedSubmissions

  const handleDelete = (id: string) => {
    setSubmissions(submissions.filter((s) => s.id !== id))
    const remaining = items.filter((s) => s.id !== id)
    if (remaining.length === 0) {
      close()
    } else if (remaining.length === 1 && selectedSubmissions.length > 0) {
      selectSubmissions(remaining)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4"
      onClick={close}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold">
            {items.length === 1 ? 'Submission' : `${items.length} Submissions`}
          </h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {items.map((s) => (
            <SubmissionCard key={s.id} submission={s} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  )
}

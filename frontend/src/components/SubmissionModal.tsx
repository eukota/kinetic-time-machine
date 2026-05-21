import { useEffect, useState } from 'react'
import { useStore, Submission } from '../store'
import { useSubmissions } from '../hooks/useSubmissions'

export const SubmissionModal = () => {
  const { selectedSubmission, selectSubmission } = useStore()
  const { getSubmissionDetails } = useSubmissions()
  const [details, setDetails] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedSubmission) {
      setDetails(null)
      return
    }
    setLoading(true)
    getSubmissionDetails(selectedSubmission.id).then((d) => {
      setDetails(d)
      setLoading(false)
    })
  }, [selectedSubmission])

  if (!selectedSubmission) return null

  const close = () => selectSubmission(null)

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4"
      onClick={close}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Submission Photos</h2>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          {loading && <p className="text-center py-8 text-gray-400">Loading...</p>}
          {!loading && details?.photos?.length ? (
            <div className="grid grid-cols-1 gap-3">
              {details.photos.map((photo) => (
                <img
                  key={photo.id}
                  src={`/photos/${photo.file_path}`}
                  alt="submission"
                  className="w-full rounded-lg object-contain max-h-80"
                />
              ))}
            </div>
          ) : (
            !loading && <p className="text-gray-400 text-sm">No photos found.</p>
          )}
          {details && (
            <div className="mt-4 pt-4 border-t text-sm text-gray-600 space-y-1">
              {details.latitude != null && details.longitude != null && (
                <p><span className="font-medium">Location: </span>{details.latitude.toFixed(5)}, {details.longitude.toFixed(5)}</p>
              )}
              {details.timestamp && (
                <p><span className="font-medium">Time: </span>{new Date(details.timestamp).toLocaleString()}</p>
              )}
              {details.note && (
                <p><span className="font-medium">Note: </span>{details.note}</p>
              )}
              {!details.latitude && !details.note && (
                <p className="text-gray-400 italic">No location or notes for this submission.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

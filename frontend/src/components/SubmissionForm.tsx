import { useState, useRef } from 'react'
import { useSubmissions } from '../hooks/useSubmissions'
import { useStore } from '../store'

interface Props {
  onClose?: () => void
}

export const SubmissionForm = ({ onClose }: Props) => {
  const { createSubmission } = useSubmissions()
  const { teams } = useStore()
  const [teamName, setTeamName] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    if (note) formData.append('note', note)
    if (teamName) formData.append('team_name', teamName)
    const result = await createSubmission(formData)
    setUploading(false)
    if (result) {
      setTeamName('')
      setNote('')
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      onClose?.()
    } else {
      alert('Upload failed — please try again')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Submit Photo</h2>
      <div>
        <label className="block text-sm font-medium mb-1">Photo *</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          required
          className="w-full text-sm border rounded px-2 py-1"
        />
        <p className="text-xs text-gray-400 mt-1">GPS &amp; timestamp extracted from photo if available</p>
        {preview && (
          <img src={preview} alt="preview" className="mt-2 w-full max-h-40 object-cover rounded" />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Team (optional)</label>
        <select
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="w-full border rounded px-2 py-1"
        >
          <option value="">Unknown / No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full border rounded px-2 py-1 text-sm"
          placeholder="Anything worth noting..."
        />
      </div>
      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? 'Uploading...' : 'Submit Photo'}
      </button>
    </form>
  )
}

import { useState, useRef, useEffect } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useSubmissions } from '../hooks/useSubmissions'
import { useStore } from '../store'

interface Props {
  onClose?: () => void
}

export const SubmissionForm = ({ onClose }: Props) => {
  const { createSubmission } = useSubmissions()
  const { teams } = useStore()
  const [teamName, setTeamName] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const [showTeamList, setShowTeamList] = useState(false)
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [hcaptchaSitekey, setHcaptchaSitekey] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const captchaRef = useRef<HCaptcha>(null)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => setHcaptchaSitekey(cfg.hcaptcha_sitekey || null))
      .catch(() => {})
  }, [])

  const filteredTeams = teamSearch.trim()
    ? teams.filter((t) =>
        t.name.toLowerCase().includes(teamSearch.toLowerCase())
      )
    : teams

  const selectTeam = (name: string) => {
    setTeamName(name)
    setTeamSearch(name)
    setShowTeamList(false)
  }

  const clearTeam = () => {
    setTeamName('')
    setTeamSearch('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    if (hcaptchaSitekey && !captchaToken) {
      alert('Please complete the captcha first')
      return
    }
    setUploading(true)
    setSuccessMsg(null)
    const formData = new FormData()
    formData.append('image', file)
    if (note) formData.append('note', note)
    if (teamName) formData.append('team_name', teamName)
    if (captchaToken) formData.append('captcha_token', captchaToken)
    const result = await createSubmission(formData)
    setUploading(false)
    if (result) {
      setTeamName('')
      setTeamSearch('')
      setNote('')
      setPreview(null)
      setCaptchaToken(null)
      captchaRef.current?.resetCaptcha()
      if (fileRef.current) fileRef.current.value = ''
      setSuccessMsg(
        result.pending_review
          ? '✓ Submitted — pending review before it appears on the map'
          : '✓ Submitted'
      )
      setTimeout(() => setSuccessMsg(null), 6000)
    } else {
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      alert('Upload failed — please try again')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Submit Photo</h2>
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded">
          {successMsg}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Photo *</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          required
          className="w-full text-sm border rounded px-2 py-1"
        />
        <p className="text-xs text-gray-400 mt-1">GPS &amp; timestamp extracted from photo if available</p>
        {preview && (
          <img src={preview} alt="preview" className="mt-2 w-full max-h-40 object-cover rounded" />
        )}
      </div>

      <div className="relative">
        <label className="block text-sm font-medium mb-1">Team (optional)</label>
        <div className="flex gap-1">
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => { setTeamSearch(e.target.value); setTeamName(''); setShowTeamList(true) }}
            onFocus={() => setShowTeamList(true)}
            onBlur={() => setTimeout(() => setShowTeamList(false), 150)}
            placeholder="Type number or name…"
            className="w-full border rounded px-2 py-1 text-sm"
          />
          {teamName && (
            <button type="button" onClick={clearTeam} className="text-gray-400 hover:text-gray-600 px-1 text-lg leading-none">×</button>
          )}
        </div>
        {showTeamList && (
          <ul className="absolute z-50 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto text-sm mt-0.5">
            <li
              className="px-3 py-1.5 text-gray-400 hover:bg-gray-50 cursor-pointer"
              onMouseDown={() => selectTeam('')}
            >
              Unknown / No team
            </li>
            {filteredTeams.map((t) => (
              <li
                key={t.id}
                className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer"
                onMouseDown={() => selectTeam(t.name)}
              >
                {t.name}
              </li>
            ))}
            {filteredTeams.length === 0 && (
              <li className="px-3 py-2 text-gray-400 italic">No matches</li>
            )}
          </ul>
        )}
        {teamName && (
          <p className="text-xs text-green-600 mt-0.5">✓ {teamName}</p>
        )}
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
      {hcaptchaSitekey && (
        <div>
          <HCaptcha
            ref={captchaRef}
            sitekey={hcaptchaSitekey}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
            theme="light"
            size="normal"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || (!!hcaptchaSitekey && !captchaToken)}
        className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {uploading ? 'Uploading...' : 'Submit Photo'}
      </button>
    </form>
  )
}

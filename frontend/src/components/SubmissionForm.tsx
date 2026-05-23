import { useState, useRef, useEffect } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useSubmissions } from '../hooks/useSubmissions'
import { useStore } from '../store'

interface Props {
  onClose?: () => void
}

type SubmitOutcome = {
  team: string
  pendingReview: boolean
  hasNote: boolean
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
  const [submitOutcome, setSubmitOutcome] = useState<SubmitOutcome | null>(null)

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
    setSubmitOutcome(null)
    const formData = new FormData()
    formData.append('image', file)
    if (note) formData.append('note', note)
    if (teamName) formData.append('team_name', teamName)
    if (captchaToken) formData.append('captcha_token', captchaToken)
    try {
      const result = await createSubmission(formData)
      setUploading(false)
      if (result) {
        setSubmitOutcome({
          team: teamName || 'none',
          pendingReview: Boolean(result.pending_review),
          hasNote: Boolean(note),
        })
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
            : '✓ Submitted — live on the map!'
        )
        setTimeout(() => setSuccessMsg(null), 6000)
      }
    } catch (e) {
      setUploading(false)
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      alert(e instanceof Error ? e.message : 'Upload failed — please try again')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-component="submission-form"
      data-component-version="1.0"
      data-component-category="conversion"
      data-entity-type="page"
      data-entity-id="page_map"
    >
      {submitOutcome && (
        <span
          className="sr-only"
          data-analytics-outcome="submission-created"
          data-outcome-team={submitOutcome.team}
          data-outcome-pending-review={String(submitOutcome.pendingReview)}
          data-outcome-has-note={String(submitOutcome.hasNote)}
        />
      )}
      <h2 className="kinetic-title text-2xl">Submit Photo</h2>

      {successMsg ? (
        <div className="kinetic-callout-success space-y-1">
          <p className="font-bold text-sm flex items-center gap-1.5">
            <span>🏆</span> Thanks — your photo was submitted!
          </p>
          <p className="text-xs text-green-800 leading-relaxed">
            It'll appear on the map and gallery after a quick safety review
            (usually just a few minutes during the race).
          </p>
        </div>
      ) : (
        <div className="kinetic-callout space-y-0.5">
          <p className="font-bold flex items-center gap-1.5">
            <span aria-hidden>🛡️</span> Photos are reviewed before going public
          </p>
          <p className="text-kinetic-navy/70">
            A quick safety check keeps the map family-friendly. Most submissions are approved within minutes.
          </p>
        </div>
      )}
      <div>
        <label className="block text-sm font-bold mb-1 text-kinetic-navy">Photo *</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          required
          className="kinetic-input file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-kinetic-gold file:font-bold file:text-kinetic-navy"
        />
        <p className="text-xs text-kinetic-navy/50 mt-1">GPS &amp; timestamp extracted from photo if available</p>
        {preview && (
          <img src={preview} alt="preview" className="mt-2 w-full max-h-40 object-cover rounded-lg border-2 border-kinetic-navy" />
        )}
      </div>

      <div className="relative">
        <label className="block text-sm font-bold mb-1 text-kinetic-navy">Team (optional)</label>
        <div className="flex gap-1">
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => { setTeamSearch(e.target.value); setTeamName(''); setShowTeamList(true) }}
            onFocus={() => setShowTeamList(true)}
            onBlur={() => setTimeout(() => setShowTeamList(false), 150)}
            placeholder="Type number or name…"
            className="kinetic-input"
          />
          {teamName && (
            <button type="button" onClick={clearTeam} className="text-kinetic-navy/40 hover:text-kinetic-red px-1 text-lg leading-none">×</button>
          )}
        </div>
        {showTeamList && (
          <ul className="absolute z-50 w-full bg-white border-2 border-kinetic-navy rounded-lg shadow-kinetic max-h-48 overflow-y-auto text-sm mt-1">
            <li
              className="px-3 py-2 text-kinetic-navy/50 hover:bg-kinetic-parchment cursor-pointer"
              onMouseDown={() => selectTeam('')}
            >
              Unknown / No team
            </li>
            {filteredTeams.map((t) => (
              <li
                key={t.id}
                className="px-3 py-2 hover:bg-kinetic-gold/30 cursor-pointer flex items-center gap-2"
                onMouseDown={() => selectTeam(t.name)}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                {t.name}
              </li>
            ))}
            {filteredTeams.length === 0 && (
              <li className="px-3 py-2 text-kinetic-navy/40 italic">No matches</li>
            )}
          </ul>
        )}
        {teamName && (
          <p className="text-xs text-kinetic-teal font-bold mt-0.5">✓ {teamName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold mb-1 text-kinetic-navy">Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="kinetic-input"
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
        className="kinetic-btn-primary w-full"
      >
        {uploading ? 'Uploading...' : '📸 Submit Photo'}
      </button>
    </form>
  )
}

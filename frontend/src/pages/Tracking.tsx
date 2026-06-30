import { useState } from 'react'

export const Tracking = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
  const [teamName, setTeamName] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/tracking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: teamName,
          code: teamCode,
          email: email,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Request submission failed')
      }

      setSubmittedEmail(email)
      setMessage(`Request submitted! The admin will review and reach out to you at ${email}`)
      setStatus('pending')
      setTeamName('')
      setTeamCode('')
      setEmail('')
      setTimeout(() => {
        onNavigate?.('map')
      }, 2000)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 md:p-8">
      <h1 className="kinetic-title text-3xl md:text-4xl mb-6">Enable GPS Tracking</h1>
      <p className="text-kinetic-navy mb-8 text-base">
        Submit a request to enable live GPS tracking for your team during the race. An admin will review your request and contact you with tracking information.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-kinetic-navy mb-2">Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g., Team Kinetic"
            required
            className="w-full px-4 py-3 border-2 border-kinetic-navy rounded-lg text-kinetic-navy font-medium focus:outline-none focus:ring-2 focus:ring-kinetic-gold focus:border-kinetic-gold"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-kinetic-navy mb-2">Team Code</label>
          <input
            type="text"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
            placeholder="e.g., KINETIC-001"
            required
            className="w-full px-4 py-3 border-2 border-kinetic-navy rounded-lg text-kinetic-navy font-medium focus:outline-none focus:ring-2 focus:ring-kinetic-gold focus:border-kinetic-gold"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-kinetic-navy mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-3 border-2 border-kinetic-navy rounded-lg text-kinetic-navy font-medium focus:outline-none focus:ring-2 focus:ring-kinetic-gold focus:border-kinetic-gold"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="kinetic-btn-primary w-full justify-center"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      {message && (
        <div
          className={`mt-6 p-4 rounded-lg font-semibold ${
            status === 'pending'
              ? 'bg-yellow-100 text-yellow-900 border-2 border-yellow-400'
              : 'bg-red-100 text-red-900 border-2 border-red-400'
          }`}
        >
          {message}
        </div>
      )}

      <p className="text-xs text-kinetic-navy/60 mt-8 text-center">
        Tracking requests are reviewed by admins and typically processed within 24 hours.
      </p>
    </div>
  )
}

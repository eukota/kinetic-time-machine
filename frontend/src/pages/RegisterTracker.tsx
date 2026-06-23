import { useState } from 'react'

export const RegisterTracker = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/trackers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email: email || undefined }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Registration failed')
      }

      setMessage('Registration submitted! Waiting for admin approval.')
      setStatus('pending')
      setCode('')
      setEmail('')
      setTimeout(() => {
        onNavigate?.('map')
      }, 3000)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 md:p-8">
      <h1 className="kinetic-title text-3xl md:text-4xl mb-6">Register for Tracking</h1>
      <p className="text-kinetic-navy mb-8 text-base">
        Enter the team code provided to register your team for live GPS tracking.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-kinetic-navy mb-2">Team Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g., KINETIC-001"
            required
            className="w-full px-4 py-3 border-2 border-kinetic-navy rounded-lg text-kinetic-navy font-medium focus:outline-none focus:ring-2 focus:ring-kinetic-gold focus:border-kinetic-gold"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-kinetic-navy mb-2">
            Email (optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 border-2 border-kinetic-navy rounded-lg text-kinetic-navy font-medium focus:outline-none focus:ring-2 focus:ring-kinetic-gold focus:border-kinetic-gold"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="kinetic-btn-primary w-full justify-center"
        >
          {loading ? 'Registering...' : 'Register'}
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
        Once approved, you'll be able to track your team's location during the race.
      </p>
    </div>
  )
}

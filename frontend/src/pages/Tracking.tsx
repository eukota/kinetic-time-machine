import { useState, useEffect } from 'react'

interface Team {
  id: string
  name: string
  color: string
}

export const Tracking = ({ onNavigate }: { onNavigate?: (view: string) => void }) => {
  // Request Tracking state
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [email, setEmail] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestStatus, setRequestStatus] = useState<'idle' | 'pending' | 'error'>('idle')
  const [requestMessage, setRequestMessage] = useState('')

  // Start Tracking state
  const [token, setToken] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'valid' | 'error'>('idle')
  const [tokenMessage, setTokenMessage] = useState('')

  // Load teams on mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetch('/api/teams/')
        if (!response.ok) throw new Error('Failed to load teams')
        const data = await response.json()
        setTeams(data)
        if (data.length > 0) {
          setSelectedTeamId(data[0].id)
        }
      } catch (err) {
        console.error('Error loading teams:', err)
      }
    }
    loadTeams()
  }, [])

  // Handle Request Tracking submission
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestLoading(true)
    setRequestStatus('idle')

    try {
      const selectedTeam = teams.find(t => t.id === selectedTeamId)
      if (!selectedTeam) {
        throw new Error('Please select a team')
      }

      const response = await fetch('/api/tracking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: selectedTeam.name,
          code: selectedTeam.name,
          email: email.trim(),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Request submission failed')
      }

      // Store team info for later token submission
      localStorage.setItem('tracking_team_id', selectedTeam.id)
      localStorage.setItem('tracking_team_name', selectedTeam.name)

      setRequestMessage('Thank you for your submission. The admin has been notified. Please get in touch with an admin to get your token.')
      setRequestStatus('pending')
      setEmail('')
      setSelectedTeamId('')
    } catch (err) {
      setRequestMessage(err instanceof Error ? err.message : 'Unknown error')
      setRequestStatus('error')
    } finally {
      setRequestLoading(false)
    }
  }

  // Handle Start Tracking submission
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return

    setTokenLoading(true)
    setTokenStatus('idle')
    setTokenMessage('')

    try {
      const trimmedToken = token.trim()

      // Check if user has team info from a previous request
      let teamId = localStorage.getItem('tracking_team_id')
      let teamName = localStorage.getItem('tracking_team_name')

      // If no saved team info, use the currently selected team from the Request Tracking form
      if (!teamId && selectedTeamId) {
        const team = teams.find(t => t.id === selectedTeamId)
        if (team) {
          teamId = team.id
          teamName = team.name
        }
      }

      if (!teamId) {
        // No team info available
        setTokenStatus('error')
        setTokenMessage(
          'Please select a team above or submit a tracking request first.'
        )
      } else {
        // Store token and team info - token will be validated when location is submitted
        localStorage.setItem('tracking_token', trimmedToken)
        localStorage.setItem('tracking_team_id', teamId)
        localStorage.setItem('tracking_team_name', teamName)

        setTokenStatus('valid')
        setTokenMessage(
          `Token accepted for ${teamName}! Location tracking is now active.`
        )
        setToken('')

        // Redirect to map after brief delay
        setTimeout(() => {
          onNavigate?.('map')
        }, 1500)
      }
    } catch (err) {
      setTokenStatus('error')
      setTokenMessage('Failed to activate tracking. Please try again.')
      console.error('Token submission error:', err)
    } finally {
      setTokenLoading(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-kinetic-cream">
      {/* Header */}
      <div className="flex-shrink-0 px-6 md:px-8 py-6 md:py-8 border-b-2 border-kinetic-navy/10">
        <h1 className="kinetic-title text-3xl md:text-4xl mb-2">Enable GPS Tracking</h1>
        <p className="text-kinetic-navy text-base">
          Submit a tracking request or use your approval token to start tracking.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left column: Request Tracking */}
        <div className="flex-1 flex flex-col min-h-0 p-6 md:p-8 md:border-r-4 md:border-kinetic-navy/20 overflow-y-auto">
          <h2 className="text-2xl font-bold text-kinetic-navy mb-4 font-display">
            Request Tracking
          </h2>
          <p className="text-kinetic-navy text-sm mb-6">
            Submit a request to enable live GPS tracking. An admin will review and provide you with a token.
          </p>

          {requestStatus === 'pending' ? (
            <div className="bg-kinetic-teal/15 border-2 border-kinetic-teal rounded-lg p-6 mt-6">
              <p className="text-kinetic-navy font-semibold text-lg mb-4">
                ✓ Thank you for your submission!
              </p>
              <p className="text-kinetic-navy text-base leading-relaxed">
                The admin has been notified. Please get in touch with an admin to get your token.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-kinetic-navy mb-2">
                  Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-kinetic-navy rounded-lg text-kinetic-navy font-medium focus:outline-none focus:ring-2 focus:ring-kinetic-gold focus:border-kinetic-gold bg-white"
                >
                  <option value="">Select a team...</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
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
                disabled={requestLoading || !selectedTeamId}
                className="kinetic-btn-primary w-full justify-center"
              >
                {requestLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          )}

          {requestMessage && (
            <div
              className={`mt-6 p-4 rounded-lg font-semibold ${
                requestStatus === 'pending'
                  ? 'bg-kinetic-teal/15 border-2 border-kinetic-teal text-kinetic-navy'
                  : 'bg-red-100 text-red-900 border-2 border-red-400'
              }`}
            >
              {requestMessage}
            </div>
          )}

          <p className="text-xs text-kinetic-navy/60 mt-8">
            Requests are typically reviewed within 24 hours.
          </p>
        </div>

        {/* Right column: Start Tracking */}
        <div className="flex-1 flex flex-col min-h-0 p-6 md:p-8 overflow-y-auto">
          <h2 className="text-2xl font-bold text-kinetic-navy mb-4 font-display">
            Start Tracking
          </h2>
          <p className="text-kinetic-navy text-sm mb-6">
            Enter your approval token to begin live GPS tracking for your team.
          </p>

          <form onSubmit={handleTokenSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-kinetic-navy mb-2">
                Tracking Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your tracking token"
                className="w-full px-4 py-3 border-2 border-kinetic-navy rounded-lg text-kinetic-navy font-medium focus:outline-none focus:ring-2 focus:ring-kinetic-gold focus:border-kinetic-gold font-mono text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={tokenLoading || !token.trim()}
              className="kinetic-btn-primary w-full justify-center"
            >
              {tokenLoading ? 'Validating...' : 'Start Tracking'}
            </button>
          </form>

          {tokenMessage && (
            <div
              className={`mt-6 p-4 rounded-lg font-semibold ${
                tokenStatus === 'valid'
                  ? 'bg-kinetic-teal/15 border-2 border-kinetic-teal text-kinetic-navy'
                  : 'bg-red-100 text-red-900 border-2 border-red-400'
              }`}
            >
              {tokenMessage}
            </div>
          )}

          <div className="mt-8 p-4 rounded-lg bg-kinetic-parchment border-2 border-kinetic-gold">
            <p className="text-xs text-kinetic-navy font-semibold mb-2">
              HOW IT WORKS:
            </p>
            <ul className="text-xs text-kinetic-navy space-y-1 list-disc list-inside">
              <li>Admin approves your request and sends you a token</li>
              <li>Enter the token here to activate tracking</li>
              <li>Your device's location will be shared in real-time</li>
              <li>Token expires after a period of inactivity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

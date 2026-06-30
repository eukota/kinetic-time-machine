/**
 * Tracking state persistence utilities
 * Manages localStorage for active tracking tokens and team info
 */

const TRACKING_TOKEN_KEY = 'tracking_token'
const TRACKING_TEAM_ID_KEY = 'tracking_team_id'
const TRACKING_TEAM_NAME_KEY = 'tracking_team_name'

export interface TrackingState {
  token: string | null
  teamId: string | null
  teamName: string | null
}

/**
 * Get current tracking state from localStorage
 */
export function getTrackingState(): TrackingState {
  if (typeof window === 'undefined') {
    return { token: null, teamId: null, teamName: null }
  }

  return {
    token: localStorage.getItem(TRACKING_TOKEN_KEY),
    teamId: localStorage.getItem(TRACKING_TEAM_ID_KEY),
    teamName: localStorage.getItem(TRACKING_TEAM_NAME_KEY),
  }
}

/**
 * Check if tracking is currently active
 */
export function isTrackingActive(): boolean {
  if (typeof window === 'undefined') return false
  const token = localStorage.getItem(TRACKING_TOKEN_KEY)
  return token !== null && token !== ''
}

/**
 * Store tracking token
 */
export function setTrackingToken(token: string, teamId?: string, teamName?: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRACKING_TOKEN_KEY, token)
  if (teamId) {
    localStorage.setItem(TRACKING_TEAM_ID_KEY, teamId)
  }
  if (teamName) {
    localStorage.setItem(TRACKING_TEAM_NAME_KEY, teamName)
  }
}

/**
 * Clear tracking state
 */
export function clearTrackingState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TRACKING_TOKEN_KEY)
  localStorage.removeItem(TRACKING_TEAM_ID_KEY)
  localStorage.removeItem(TRACKING_TEAM_NAME_KEY)
}

/**
 * Get tracking token
 */
export function getTrackingToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TRACKING_TOKEN_KEY)
}

/**
 * Get team ID for current tracking
 */
export function getTrackingTeamId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TRACKING_TEAM_ID_KEY)
}

/**
 * Get team name for current tracking
 */
export function getTrackingTeamName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TRACKING_TEAM_NAME_KEY)
}

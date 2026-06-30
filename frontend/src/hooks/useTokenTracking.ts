import { useEffect, useRef, useState, useCallback } from 'react'
import { getTrackingToken, getTrackingTeamId, clearTrackingState } from '../utils/trackingStorage'
import { useGeolocation } from './useGeolocation'

interface UseTokenTrackingOptions {
  enabled?: boolean
  onError?: (error: string) => void
  onSuccess?: () => void
}

/**
 * Hook for managing token-based location tracking
 * Automatically sends location updates when a valid token exists
 */
export const useTokenTracking = (options: UseTokenTrackingOptions = {}) => {
  const { enabled = true, onError, onSuccess } = options
  const { location, startWatching, stopWatching, watching } = useGeolocation()
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [trackingError, setTrackingError] = useState<string | null>(null)
  const trackingAttemptRef = useRef(0)

  // Check if token tracking should be active
  useEffect(() => {
    if (!enabled) return

    const token = getTrackingToken()
    const teamId = getTrackingTeamId()

    if (token && teamId) {
      setIsTokenValid(true)
      if (!watching) {
        startWatching(30000) // Update every 30 seconds
      }
    } else {
      setIsTokenValid(false)
      if (watching) {
        stopWatching()
      }
    }
  }, [enabled, watching, startWatching, stopWatching])

  // Send location updates with token
  useEffect(() => {
    if (!location || !isTokenValid) return

    const token = getTrackingToken()
    const teamId = getTrackingTeamId()

    if (!token || !teamId) return

    const sendLocation = async () => {
      try {
        const response = await fetch('/api/trackers/update-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: teamId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp.toISOString(),
            token: token,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          const errorMsg = error.detail || 'Failed to send location'

          if (response.status === 401 || response.status === 403) {
            // Token is invalid or expired
            setTrackingError('Token is no longer valid. Tracking stopped.')
            clearTrackingState()
            setIsTokenValid(false)
            stopWatching()
            onError?.('Invalid or expired token')
          } else {
            setTrackingError(errorMsg)
            onError?.(errorMsg)
          }
        } else {
          // Clear error on successful update
          setTrackingError(null)
          trackingAttemptRef.current = 0
          onSuccess?.()
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('Token tracking error:', msg)
        setTrackingError(msg)
        onError?.(msg)
      }
    }

    sendLocation()
  }, [location, isTokenValid, stopWatching, onError, onSuccess])

  const stopTracking = useCallback(() => {
    clearTrackingState()
    stopWatching()
    setIsTokenValid(false)
    setTrackingError(null)
  }, [stopWatching])

  return {
    isTokenValid,
    watching,
    location,
    trackingError,
    stopTracking,
  }
}

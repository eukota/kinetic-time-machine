import { useEffect } from 'react'
import { initAnalytics, enableRouteTracking, notifyAnalyticsDomUpdated } from './analytics-core'
import { pageIdForPath } from '../lib/routing'

/** Marks hydration complete and boots the DOM-driven analytics core once. */
export function AnalyticsBoot() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
    window.__analyticsCtx = {
      page: {
        brand: 'kinetic-time-machine',
        page_type: 'app',
        page_id: pageIdForPath(window.location.pathname),
        page_path: window.location.pathname,
      },
      session: { interactionCount: 0 },
    }
    void initAnalytics().then(() => {
      enableRouteTracking()
      notifyAnalyticsDomUpdated()
    })
  }, [])

  return null
}

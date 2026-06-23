import { useCallback, useEffect, useState } from 'react'
import { pathToView, viewToPath, type AppView, type RouteState } from '../lib/routing'

export function useViewRoute() {
  const [route, setRouteState] = useState<RouteState>(() => pathToView(window.location.pathname))

  useEffect(() => {
    const parsed = pathToView(window.location.pathname)
    const canonical = viewToPath(parsed.view, parsed.teamId)
    if (window.location.pathname !== canonical) {
      history.replaceState(parsed, '', canonical)
    }
    setRouteState(parsed)
  }, [])

  useEffect(() => {
    const onPopState = () => setRouteState(pathToView(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setView = useCallback((next: AppView, teamId?: string) => {
    const path = viewToPath(next, teamId)
    if (window.location.pathname !== path) {
      history.pushState({ view: next, teamId }, '', path)
    }
    setRouteState({ view: next, teamId })
  }, [])

  return { view: route.view, teamId: route.teamId, setView }
}

export { viewToPath, pathToView, type AppView, type RouteState } from '../lib/routing'

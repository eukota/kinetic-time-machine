import { useCallback, useEffect, useState } from 'react'
import { trackPageView, viewToPath, type AppView } from '../lib/analytics'

const VIEWS: AppView[] = ['map', 'gallery', 'about', 'admin']
const DEFAULT_VIEW: AppView = 'map'

export function pathToView(pathname: string): AppView {
  const segment = pathname.replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''
  if (segment === '' || segment === 'map') return 'map'
  if (VIEWS.includes(segment as AppView)) return segment as AppView
  return DEFAULT_VIEW
}

export function useViewRoute() {
  const [view, setViewState] = useState<AppView>(() => pathToView(window.location.pathname))

  useEffect(() => {
    const parsed = pathToView(window.location.pathname)
    const canonical = viewToPath(parsed)
    if (window.location.pathname !== canonical) {
      window.history.replaceState({ view: parsed }, '', canonical)
    }
    setViewState(parsed)
    trackPageView(canonical)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const next = pathToView(window.location.pathname)
      setViewState(next)
      trackPageView(window.location.pathname)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setView = useCallback((next: AppView) => {
    const path = viewToPath(next)
    if (window.location.pathname !== path) {
      window.history.pushState({ view: next }, '', path)
      trackPageView(path)
    }
    setViewState(next)
  }, [])

  return { view, setView }
}

export { viewToPath }

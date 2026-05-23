import { useCallback, useEffect, useState } from 'react'
import { pathToView, viewToPath, type AppView } from '../lib/routing'

export function useViewRoute() {
  const [view, setViewState] = useState<AppView>(() => pathToView(window.location.pathname))

  useEffect(() => {
    const parsed = pathToView(window.location.pathname)
    const canonical = viewToPath(parsed)
    if (window.location.pathname !== canonical) {
      history.replaceState({ view: parsed }, '', canonical)
    }
    setViewState(parsed)
  }, [])

  useEffect(() => {
    const onPopState = () => setViewState(pathToView(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setView = useCallback((next: AppView) => {
    const path = viewToPath(next)
    if (window.location.pathname !== path) {
      history.pushState({ view: next }, '', path)
    }
    setViewState(next)
  }, [])

  return { view, setView }
}

export { viewToPath, pathToView, type AppView } from '../lib/routing'

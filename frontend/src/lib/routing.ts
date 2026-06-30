export type AppView = 'map' | 'gallery' | 'about' | 'admin' | 'register-tracker' | 'team-detail' | 'track-location' | 'tracking'

const VIEWS: AppView[] = ['map', 'gallery', 'about', 'admin', 'register-tracker', 'team-detail', 'track-location', 'tracking']

export interface RouteState {
  view: AppView;
  teamId?: string;
}

export function viewToPath(view: AppView, teamId?: string): string {
  if (view === 'map') return '/'
  if (view === 'team-detail' && teamId) return `/team/${teamId}`
  if (view === 'track-location' && teamId) return `/track/${teamId}`
  return `/${view}`
}

export function pathToView(pathname: string): RouteState {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '')
  const parts = cleaned.split('/')
  const segment = parts[0] ?? ''

  if (segment === '' || segment === 'map') return { view: 'map' }
  if (segment === 'team' && parts[1]) return { view: 'team-detail', teamId: parts[1] }
  if (segment === 'track' && parts[1]) return { view: 'track-location', teamId: parts[1] }
  if (VIEWS.includes(segment as AppView)) return { view: segment as AppView }
  return { view: 'map' }
}

export function pageIdForPath(path: string): string {
  const route = pathToView(path)
  return `page_${route.view}`
}

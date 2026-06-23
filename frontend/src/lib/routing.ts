export type AppView = 'map' | 'gallery' | 'about' | 'admin' | 'register-tracker' | 'team-detail'

const VIEWS: AppView[] = ['map', 'gallery', 'about', 'admin', 'register-tracker', 'team-detail']

export interface RouteState {
  view: AppView;
  teamId?: string;
}

export function viewToPath(view: AppView, teamId?: string): string {
  if (view === 'map') return '/'
  if (view === 'team-detail' && teamId) return `/team/${teamId}`
  return `/${view}`
}

export function pathToView(pathname: string): RouteState {
  const cleaned = pathname.replace(/^\/+|\/+$/g, '')
  const parts = cleaned.split('/')
  const segment = parts[0] ?? ''

  if (segment === '' || segment === 'map') return { view: 'map' }
  if (segment === 'team' && parts[1]) return { view: 'team-detail', teamId: parts[1] }
  if (VIEWS.includes(segment as AppView)) return { view: segment as AppView }
  return { view: 'map' }
}

export function pageIdForPath(path: string): string {
  const view = pathToView(path)
  return `page_${view}`
}

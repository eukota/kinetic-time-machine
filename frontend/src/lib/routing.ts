export type AppView = 'map' | 'gallery' | 'about' | 'admin'

const VIEWS: AppView[] = ['map', 'gallery', 'about', 'admin']

export function viewToPath(view: AppView): string {
  return view === 'map' ? '/' : `/${view}`
}

export function pathToView(pathname: string): AppView {
  const segment = pathname.replace(/^\/+|\/+$/g, '').split('/')[0] ?? ''
  if (segment === '' || segment === 'map') return 'map'
  if (VIEWS.includes(segment as AppView)) return segment as AppView
  return 'map'
}

export function pageIdForPath(path: string): string {
  const view = pathToView(path)
  return `page_${view}`
}

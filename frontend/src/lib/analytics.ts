/** Umami event helpers — no-ops when the script is not loaded (local dev). */

declare global {
  interface Window {
    umami?: {
      track: (
        event?: string | ((props: Record<string, unknown>) => Record<string, unknown>),
        data?: Record<string, unknown>,
      ) => void
    }
  }
}

export type AppView = 'map' | 'gallery' | 'about' | 'admin'

export type AnalyticsEvent =
  | 'submission-created'
  | 'photo-view'
  | 'photo-nav'
  | 'gallery-sort'
  | 'gallery-filter-teams'
  | 'map-filter-day'
  | 'map-filter-year'
  | 'map-filter-team'
  | 'submit-form-open'
  | 'filters-panel-open'
  | 'admin-approve'
  | 'admin-reject'

export function trackEvent(event: AnalyticsEvent, data?: Record<string, unknown>) {
  window.umami?.track(event, data)
}

/** Record a virtual page view so Umami can segment by tab URL. */
export function trackPageView(path: string) {
  if (!window.umami) return
  window.umami.track((props) => ({ ...props, url: path }))
}

export function viewToPath(view: AppView): string {
  return view === 'map' ? '/' : `/${view}`
}

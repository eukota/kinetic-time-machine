const USER_QUERY_PARAM = 'user'
const STORAGE_KEY = 'ktm.analytics.user'

/** Read ?user= from the URL, persist for the tab session, and return the id. */
export function initAnalyticsUser(): string | null {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get(USER_QUERY_PARAM)?.trim()

  if (fromUrl) {
    sessionStorage.setItem(STORAGE_KEY, fromUrl)
    return fromUrl
  }

  return sessionStorage.getItem(STORAGE_KEY)
}

export function getAnalyticsUser(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}

/** Append ?user= for Umami pageview URLs so Query filters work in the dashboard. */
export function analyticsUrlPath(pathname?: string): string {
  const path = pathname ?? window.location.pathname
  const user = getAnalyticsUser()
  if (!user) return path
  return `${path}?${USER_QUERY_PARAM}=${encodeURIComponent(user)}`
}

const USER_QUERY_PARAM = 'user'
const STORAGE_KEY = 'ktm.analytics.user'

declare global {
  interface Window {
    __analyticsCtx?: {
      page: Record<string, unknown>
      session: { interactionCount: number; user?: string | null }
    }
  }
}

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

/** Drop the ?user= analytics tag for this tab and remove it from the URL. */
export function clearAnalyticsUser(): void {
  sessionStorage.removeItem(STORAGE_KEY)

  if (window.__analyticsCtx?.session) {
    window.__analyticsCtx.session.user = null
  }

  const url = new URL(window.location.href)
  if (url.searchParams.has(USER_QUERY_PARAM)) {
    url.searchParams.delete(USER_QUERY_PARAM)
    const search = url.searchParams.toString()
    history.replaceState(history.state, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`)
  }

  window.dispatchEvent(new CustomEvent('ktm:analytics-user-cleared'))
}

/** Append ?user= for Umami pageview URLs so Query filters work in the dashboard. */
export function analyticsUrlPath(pathname?: string): string {
  const path = pathname ?? window.location.pathname
  const user = getAnalyticsUser()
  if (!user) return path
  return `${path}?${USER_QUERY_PARAM}=${encodeURIComponent(user)}`
}

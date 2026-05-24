const UMAMI_ORIGIN = 'https://analytics.eukota.com'

export interface AnalyticsDashboardLink {
  url: string
  label: string
  environment: 'staging' | 'production' | 'local'
}

function resolveEnvironment(hostname: string): AnalyticsDashboardLink['environment'] {
  if (hostname === 'staging.kinetic.eukota.com') return 'staging'
  if (hostname === 'kinetic.eukota.com' || hostname === 'www.kinetic.eukota.com') return 'production'
  return 'local'
}

function environmentLabel(environment: AnalyticsDashboardLink['environment']): string {
  switch (environment) {
    case 'staging':
      return 'Staging analytics'
    case 'production':
      return 'Production analytics'
    default:
      return 'Analytics dashboard'
  }
}

function resolveWebsiteId(): string {
  if (typeof document !== 'undefined') {
    const fromScript = document.querySelector('script[data-website-id]')?.getAttribute('data-website-id')
    if (fromScript) return fromScript
  }
  return import.meta.env.VITE_UMAMI_WEBSITE_ID || ''
}

/** Umami dashboard link for the current deploy (staging vs prod website). */
export function getAnalyticsDashboard(): AnalyticsDashboardLink {
  const environment = resolveEnvironment(window.location.hostname)
  const websiteId = resolveWebsiteId()
  const url = websiteId
    ? `${UMAMI_ORIGIN}/websites/${websiteId}`
    : UMAMI_ORIGIN

  return {
    url,
    label: environmentLabel(environment),
    environment,
  }
}

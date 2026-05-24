/**
 * DOM-driven analytics core for Kinetic Time Machine.
 * Components declare identity via data-* attributes; this module observes and
 * dispatches to Umami (Darrell's existing stack) plus a console adapter in dev.
 */

import registryData from './component-registry.json'

const CORE_VERSION = '1.0.0'
const REGISTRY_PATH = '/analytics/component-registry.json'
const IMPRESSION_THRESHOLD = 0.5
const IMPRESSION_DWELL_MS = 1000

const DEBUG =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).has('analytics-debug') ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

type RegistryComponent = {
  component_id: string
  component_category?: string
  events?: { event_name: string; trigger: string }[]
}

type Registry = { components: RegistryComponent[] }

type AnalyticsPayload = Record<string, string | number | boolean | null>

declare global {
  interface Window {
    umami?: {
      track: (
        event?: string | ((props: Record<string, unknown>) => Record<string, unknown>),
        data?: Record<string, unknown>,
      ) => void
    }
    __analyticsCtx?: {
      page: Record<string, unknown>
      session: { interactionCount: number }
    }
  }
}

let registry: Registry = registryData as Registry
const ctaActionToEvent: Record<string, string> = {}
const pendingImpressions = new Map<Element, ReturnType<typeof setTimeout>>()
const viewedComponents = new Set<string>()
let booted = false
let routeTrackingEnabled = false
let impressionObserver: IntersectionObserver

function trace(stage: string, msg: string, extra?: unknown) {
  if (!DEBUG) return
  console.log(`%c[Analytics]%c ${stage} %c${msg}`, 'color:#2563eb;font-weight:700', 'color:#64748b', 'color:#334155', extra ?? '')
}

function isHydrated(): boolean {
  return document.documentElement.dataset.hydrated === 'true'
}

function newUUID(): string {
  return crypto.randomUUID?.() ?? `evt-${Date.now()}`
}

function camelToKebab(key: string): string {
  return key.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)
}

function walkContext(el: Element): Record<string, string> {
  const context: Record<string, string> = {}
  let current: Element | null = el
  while (current && current !== document.documentElement) {
    const dataset = (current as HTMLElement).dataset
    for (const key of Object.keys(dataset)) {
      const attrName = camelToKebab(key)
      if (!(attrName in context) && dataset[key as keyof DOMStringMap]) {
        context[attrName] = dataset[key as keyof DOMStringMap]!
      }
    }
    if ((current as HTMLElement).dataset.component) break
    current = current.parentElement
  }

  const parentCtxStr = context['component-context']
  if (parentCtxStr) {
    for (const pair of parentCtxStr.split('|')) {
      const [k, v] = pair.split(':')
      if (k && v !== undefined) context[`parent_${k}`] = v
    }
    delete context['component-context']
  }
  return context
}

function buildActionMap() {
  for (const el of document.querySelectorAll('[data-cta-action]')) {
    const action = (el as HTMLElement).dataset.ctaAction
    if (!action || ctaActionToEvent[action]) continue
    const componentEl = el.closest('[data-component]')
    const componentId = componentEl ? (componentEl as HTMLElement).dataset.component : null
    const entry = registry.components.find((c) => c.component_id === componentId)
    const spec = entry?.events?.find((e) => e.trigger === action)
    ctaActionToEvent[action] = spec?.event_name ?? 'cta_click'
  }
}

function buildPayload(eventName: string, domContext: Record<string, string>, overrides: AnalyticsPayload = {}): AnalyticsPayload {
  const pageCtx = window.__analyticsCtx?.page ?? {}
  const session = window.__analyticsCtx?.session ?? { interactionCount: 0 }
  session.interactionCount = (session.interactionCount ?? 0) + 1

  const componentId = domContext.component ?? null
  const entry = registry.components.find((c) => c.component_id === componentId)

  const payload: AnalyticsPayload = {
    event: eventName,
    event_id: newUUID(),
    analytics_version: CORE_VERSION,
    timestamp_ms: Date.now(),
    interaction_sequence: session.interactionCount,
    page_type: (pageCtx.page_type as string) ?? null,
    page_id: (pageCtx.page_id as string) ?? null,
    brand: (pageCtx.brand as string) ?? null,
    component_id: componentId,
    component_version: domContext['component-version'] ?? null,
    component_instance: domContext['component-instance'] ?? null,
    component_category: domContext['component-category'] ?? entry?.component_category ?? null,
    entity_type: domContext['entity-type'] ?? null,
    entity_id: domContext['entity-id'] ?? null,
    cta_action: domContext['cta-action'] ?? null,
    cta_label: domContext['cta-label'] ?? null,
    cta_destination: domContext['cta-destination'] ?? null,
    ...overrides,
  }

  for (const [k, v] of Object.entries(domContext)) {
    if (k.startsWith('parent_') && !(k in payload)) payload[k] = v
  }
  return payload
}

function umamiProps(payload: AnalyticsPayload): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v
  }
  return out
}

const consoleAdapter = {
  enabled: () => DEBUG,
  send: (eventName: string, payload: AnalyticsPayload) => {
    console.groupCollapsed(`%c[Analytics] %c${eventName}`, 'color:#2563eb', 'color:#16a34a;font-weight:700')
    console.table(umamiProps(payload))
    console.groupEnd()
  },
}

/** Maps canonical events to Umami — preserves Darrell's submission-created naming. */
const umamiAdapter = {
  enabled: () => typeof window.umami !== 'undefined',
  send: (eventName: string, payload: AnalyticsPayload) => {
    if (!window.umami) return

    if (eventName === 'page_view') {
      const path = (payload.page_path as string) || window.location.pathname
      window.umami.track((props) => ({ ...props, url: path }))
      return
    }

    if (eventName === 'submission-created') {
      window.umami.track('submission-created', {
        team: payload.team ?? payload.outcome_team ?? 'none',
        pending_review: payload.pending_review === true || payload.pending_review === 'true' || payload.outcome_pending_review === 'true',
        has_note: payload.has_note === true || payload.has_note === 'true' || payload.outcome_has_note === 'true',
      })
      return
    }

    window.umami.track(eventName, umamiProps(payload))
  },
}

const adapters = [consoleAdapter, umamiAdapter]

function dispatch(eventName: string, payload: AnalyticsPayload) {
  trace('DISPATCH', eventName, payload)
  for (const adapter of adapters) {
    if (!adapter.enabled()) continue
    try {
      adapter.send(eventName, payload)
    } catch (e) {
      trace('DISPATCH', `adapter error: ${e}`)
    }
  }
}

function recordImpression(el: Element, threshold: number) {
  const ds = (el as HTMLElement).dataset
  const instanceId = ds.componentInstance || ds.component || 'unknown'
  const pageId = (window.__analyticsCtx?.page?.page_id as string) || window.location.pathname
  const dedupeKey = `${pageId}:${instanceId}`
  if (viewedComponents.has(dedupeKey)) return

  viewedComponents.add(dedupeKey)
  dispatch('component_view', buildPayload('component_view', walkContext(el), { visibility_threshold: threshold }))
  if (ds.analyticsPersistent !== 'true') impressionObserver.unobserve(el)
}

function getImpressionConfig(el: HTMLElement) {
  return {
    threshold: parseFloat(el.dataset.analyticsImpressionThreshold || '') || IMPRESSION_THRESHOLD,
    dwellMs: parseInt(el.dataset.analyticsImpressionDwell || '', 10) || IMPRESSION_DWELL_MS,
  }
}

function handleImpressions(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const el = entry.target as HTMLElement
    const cfg = getImpressionConfig(el)
    if (entry.isIntersecting && entry.intersectionRatio >= cfg.threshold) {
      if (pendingImpressions.has(el)) continue
      const timer = setTimeout(() => {
        pendingImpressions.delete(el)
        recordImpression(el, cfg.threshold)
      }, cfg.dwellMs)
      pendingImpressions.set(el, timer)
    } else {
      const existing = pendingImpressions.get(el)
      if (existing) {
        clearTimeout(existing)
        pendingImpressions.delete(el)
      }
    }
  }
}

function observeComponents(root: ParentNode = document) {
  for (const el of root.querySelectorAll('[data-component]')) {
    const htmlEl = el as HTMLElement
    if (htmlEl.dataset.analyticsSkip === 'true') continue
    impressionObserver.observe(htmlEl)
  }
}

function processOutcomes(root: ParentNode = document) {
  for (const el of root.querySelectorAll('[data-analytics-outcome]:not([data-analytics-outcome-fired])')) {
    const htmlEl = el as HTMLElement
    const outcome = htmlEl.dataset.analyticsOutcome
    if (!outcome) continue

    htmlEl.dataset.analyticsOutcomeFired = 'true'
    const overrides: AnalyticsPayload = { interaction_type: 'outcome' }

    if (outcome === 'submission-created') {
      overrides.team = htmlEl.dataset.outcomeTeam ?? 'none'
      overrides.pending_review = htmlEl.dataset.outcomePendingReview ?? 'false'
      overrides.has_note = htmlEl.dataset.outcomeHasNote ?? 'false'
    }

    dispatch(outcome, buildPayload(outcome, walkContext(htmlEl), overrides))
  }
}

function resetSpaImpressions() {
  viewedComponents.clear()
  for (const timer of pendingImpressions.values()) clearTimeout(timer)
  pendingImpressions.clear()
  for (const el of document.querySelectorAll('[data-component]')) {
    const htmlEl = el as HTMLElement
    if (htmlEl.dataset.analyticsSkip === 'true' || htmlEl.dataset.analyticsPersistent === 'true') continue
    impressionObserver.unobserve(htmlEl)
    impressionObserver.observe(htmlEl)
  }
}

function onRouteChange(navigationType: 'spa' | 'popstate' | 'hard_load') {
  if (!routeTrackingEnabled) return
  const path = window.location.pathname
  window.__analyticsCtx = window.__analyticsCtx ?? { page: {}, session: { interactionCount: 0 } }
  window.__analyticsCtx.page = {
    ...window.__analyticsCtx.page,
    page_id: `page_${path === '/' ? 'map' : path.slice(1)}`,
    page_path: path,
  }
  resetSpaImpressions()
  dispatch('page_view', buildPayload('page_view', {}, { page_path: path, navigation_type: navigationType }))
  buildActionMap()
  observeComponents()
  processOutcomes()
}

function patchHistory() {
  if ((patchHistory as { patched?: boolean }).patched) return
  ;(patchHistory as { patched?: boolean }).patched = true
  const originalPush = history.pushState.bind(history)
  const originalReplace = history.replaceState.bind(history)

  history.pushState = (...args) => {
    originalPush(...args)
    onRouteChange('spa')
  }
  history.replaceState = (...args) => {
    originalReplace(...args)
    onRouteChange('spa')
  }
  window.addEventListener('popstate', () => onRouteChange('popstate'))
}

function onClick(event: MouseEvent) {
  if (!isHydrated()) return
  const target = (event.target as Element | null)?.closest('[data-cta-action]') as HTMLElement | null
  if (!target) return

  const domContext = walkContext(target)
  const ctaAction = domContext['cta-action'] ?? ''
  const eventName = ctaActionToEvent[ctaAction] ?? 'cta_click'
  dispatch(eventName, buildPayload(eventName, domContext, { interaction_type: 'click', element_tag: target.tagName.toLowerCase() }))
}

export function markAnalyticsOutcome(
  sink: HTMLElement | null,
  outcome: string,
  props: Record<string, string | boolean | number>,
  componentId = 'submission-modal',
) {
  if (!sink) return
  sink.dataset.component = componentId
  sink.dataset.componentVersion = '1.0'
  if (props.entity_id) sink.dataset.entityId = String(props.entity_id)
  if (props.entity_type) sink.dataset.entityType = String(props.entity_type)
  else if (props.entity_id) sink.dataset.entityType = 'content'
  sink.dataset.analyticsOutcome = outcome
  delete sink.dataset.analyticsOutcomeFired
  for (const [k, v] of Object.entries(props)) {
    if (k === 'entity_id' || k === 'entity_type') continue
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    const datasetKey = `outcome${camel.charAt(0).toUpperCase()}${camel.slice(1)}` as keyof DOMStringMap
    sink.dataset[datasetKey] = String(v)
  }
  processOutcomes(sink.parentElement ?? document)
}

export function notifyAnalyticsDomUpdated() {
  buildActionMap()
  observeComponents()
  processOutcomes()
}

export async function initAnalytics() {
  if (booted) return
  booted = true

  try {
    const res = await fetch(REGISTRY_PATH)
    if (res.ok) registry = (await res.json()) as Registry
  } catch {
    trace('REGISTRY', 'using bundled registry fallback')
  }

  window.__analyticsCtx = window.__analyticsCtx ?? {
    page: { brand: 'kinetic-time-machine', page_type: 'app' },
    session: { interactionCount: 0 },
  }

  impressionObserver = new IntersectionObserver(handleImpressions, {
    root: null,
    threshold: [0, 0.25, 0.5, 0.75, 1],
  })

  document.addEventListener('click', onClick)

  const domMutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        const el = node as Element
        if (el.matches('[data-component]') || el.querySelector('[data-component]')) observeComponents(el)
        if (el.matches('[data-analytics-outcome]') || el.querySelector('[data-analytics-outcome]')) processOutcomes(el)
      }
    }
    buildActionMap()
  })

  patchHistory()
  buildActionMap()
  observeComponents()
  processOutcomes()
  domMutationObserver.observe(document.body, { childList: true, subtree: true })

  trace('BOOT', 'analytics core ready', { version: CORE_VERSION })
}

export function enableRouteTracking() {
  routeTrackingEnabled = true
  onRouteChange('hard_load')
}

if (typeof window !== 'undefined') {
  patchHistory()
}

// Single source of truth for per-race-day colors.
// Used by both the map route lines (RaceCourseOverlay) and the Course Day
// filter so they can never drift apart again.
export const DAY_COLORS: Record<number, string> = {
  1: '#2563eb', // Day 1 — Arcata → Eureka (blue)
  2: '#c026d3', // Day 2 — Eureka → Crab Park (magenta)
  3: '#ea580c', // Day 3 — Crab Park → Ferndale (orange)
}

// Fallback for any unexpected day number.
export const dayColor = (day: number): string => DAY_COLORS[day] ?? '#6b7280'

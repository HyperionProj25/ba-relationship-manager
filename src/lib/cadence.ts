export type CadenceZone = 'green' | 'yellow' | 'red'

/**
 * Calculate days since a given ISO date string. Returns Infinity if null.
 */
export function daysSinceDate(isoDate: string | null): number {
  if (!isoDate) return Infinity
  const then = new Date(isoDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  then.setHours(0, 0, 0, 0)
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Returns an HSL color string on a green-to-red gradient.
 * 0-5 days: green | 5-14 days: smooth transition | 14+ days: red
 */
export function cadenceColor(daysSince: number): string {
  if (!isFinite(daysSince)) return 'hsl(0, 70%, 48%)'
  const clamped = Math.min(Math.max(daysSince, 0), 14)
  const t = clamped / 14
  const hue = 142 * (1 - t)
  const saturation = 70
  const lightness = 45 + t * 5
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`
}

/**
 * Categorize days into a zone for summary stats.
 */
export function cadenceZone(daysSince: number): CadenceZone {
  if (daysSince <= 5) return 'green'
  if (daysSince <= 10) return 'yellow'
  return 'red'
}

/**
 * Format days-since as a display string.
 */
export function cadenceLabel(daysSince: number): string {
  if (!isFinite(daysSince)) return 'Never'
  if (daysSince === 0) return 'Today'
  if (daysSince === 1) return '1d ago'
  return `${daysSince}d ago`
}

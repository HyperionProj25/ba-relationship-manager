import type { Contact } from '@/types'

export const BUILTIN_CATEGORIES = [
  'Baseline',
  'MLB',
  'Investor',
  'IAB',
  'Partner',
  'Vendor',
  'University',
  'Other',
] as const

export function allCategories(contacts: Pick<Contact, 'category'>[]): string[] {
  const set = new Set<string>(BUILTIN_CATEGORIES)
  for (const c of contacts) {
    if (c.category) set.add(c.category)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

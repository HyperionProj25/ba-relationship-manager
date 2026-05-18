import type { BrainNode, BrainNodeType } from '@/types'

export type ClusterId = 'mlb' | 'investors' | 'iab' | 'technology' | 'strategy' | 'other'

export interface ClusterMeta {
  id: ClusterId
  label: string
  color: string
  // Position angle around canvas center (radians).
  angle: number
}

export const CLUSTERS: ClusterMeta[] = [
  { id: 'mlb',        label: 'MLB',        color: '#3DA5D9', angle: -Math.PI / 2 },                  // top
  { id: 'investors',  label: 'Investors',  color: '#22C55E', angle: -Math.PI / 2 + (2 * Math.PI / 6) },
  { id: 'iab',        label: 'IAB',        color: '#A855F7', angle: -Math.PI / 2 + (4 * Math.PI / 6) },
  { id: 'technology', label: 'Technology', color: '#E8E8E8', angle:  Math.PI / 2 },                  // bottom
  { id: 'strategy',   label: 'Strategy',   color: '#FF6B35', angle:  Math.PI / 2 + (2 * Math.PI / 6) },
  { id: 'other',      label: 'Other',      color: '#999999', angle:  Math.PI / 2 + (4 * Math.PI / 6) },
]

export const CLUSTER_BY_ID: Record<ClusterId, ClusterMeta> = CLUSTERS.reduce((acc, c) => {
  acc[c.id] = c
  return acc
}, {} as Record<ClusterId, ClusterMeta>)

const CLUSTER_TAG_PREFIX = 'cluster:'

export function clusterTagFor(id: ClusterId): string {
  return `${CLUSTER_TAG_PREFIX}${id}`
}

/** Strip cluster: tags from a tag array (for display). */
export function visibleTags(tags: string[] | null | undefined): string[] {
  if (!tags) return []
  return tags.filter(t => !t.toLowerCase().startsWith(CLUSTER_TAG_PREFIX))
}

/** Pull an explicit cluster: tag from a node's tags, if present. */
function explicitCluster(tags: string[] | null | undefined): ClusterId | null {
  if (!tags) return null
  for (const raw of tags) {
    const t = raw.toLowerCase()
    if (!t.startsWith(CLUSTER_TAG_PREFIX)) continue
    const id = t.slice(CLUSTER_TAG_PREFIX.length) as ClusterId
    if (id in CLUSTER_BY_ID) return id
  }
  return null
}

const MLB_TAGS = new Set(['mlb', 'league', 'baseball', 'team', 'mlbam'])
const INVESTOR_TAGS = new Set(['investor', 'vc', 'capital', 'fund', 'investment', 'lp', 'angel'])
const IAB_TAGS = new Set(['iab', 'advisory', 'advisor', 'board'])
const TECH_TAGS = new Set(['data', 'tech', 'model', 'api', 'pipeline', 'ml', 'ai', 'infra'])

const STRATEGY_TYPES = new Set<BrainNodeType>(['strategy', 'decision', 'idea'])
const TECH_TYPES = new Set<BrainNodeType>(['technology'])

export function clusterForNode(node: Pick<BrainNode, 'type' | 'tags'>): ClusterId {
  const explicit = explicitCluster(node.tags)
  if (explicit) return explicit

  const lowerTags = (node.tags ?? []).map(t => t.toLowerCase())
  const hasTag = (set: Set<string>) => lowerTags.some(t => set.has(t))

  if (node.type === 'person') {
    if (hasTag(MLB_TAGS)) return 'mlb'
    if (hasTag(INVESTOR_TAGS)) return 'investors'
    if (hasTag(IAB_TAGS)) return 'iab'
    return 'other'
  }
  if (TECH_TYPES.has(node.type) || hasTag(TECH_TAGS)) return 'technology'
  if (STRATEGY_TYPES.has(node.type)) return 'strategy'
  return 'other'
}

/** Compute the canvas-relative center for a cluster, given canvas radius. */
export function clusterCenter(id: ClusterId, radius: number): { x: number; y: number } {
  const c = CLUSTER_BY_ID[id]
  return { x: Math.cos(c.angle) * radius, y: Math.sin(c.angle) * radius }
}

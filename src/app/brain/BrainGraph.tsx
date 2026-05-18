'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import type { BrainNodeType } from '@/types'
import { clusterCenter, type ClusterId } from './clusters'

export interface GraphNode {
  id: string
  title: string
  type: BrainNodeType
  cluster: ClusterId
  isTeam: boolean
  tags: string[]
  degree: number
  x?: number
  y?: number
}

export interface GraphLink {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  relationship: string
  strength: number
}

export interface BrainGraphHandle {
  zoomToCluster: (id: ClusterId) => void
  zoomToNode: (id: string) => void
  zoomToFit: () => void
}

interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
  search: string
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  selectedId: string | null
  focusedCluster: ClusterId | null
  onNodeClick: (node: GraphNode) => void
  onBackgroundClick: () => void
}

// Color helpers ---------------------------------------------------------------

const TYPE_COLORS: Record<BrainNodeType, string> = {
  person: '#4A90D9',
  company: '#3DA5D9',
  strategy: '#7ED321',
  decision: '#D0021B',
  research: '#9013FE',
  idea: '#F8E71C',
  event: '#50E3C2',
  technology: '#E8E8E8',
  term: '#BD10E0',
  milestone: '#FF6B35',
}

function colorFor(node: GraphNode): string {
  if (node.type === 'person' && node.isTeam) return '#FFC233'
  return TYPE_COLORS[node.type] ?? '#888'
}

// Custom cluster force --------------------------------------------------------

const CLUSTER_RADIUS = 360
const CLUSTER_STRENGTH = 0.12

interface ClusterableNode {
  cluster: ClusterId
  x: number
  y: number
  vx: number
  vy: number
}

function makeClusterForce() {
  let internalNodes: ClusterableNode[] = []
  const force = (alpha: number) => {
    for (const n of internalNodes) {
      const center = clusterCenter(n.cluster, CLUSTER_RADIUS)
      n.vx += (center.x - n.x) * CLUSTER_STRENGTH * alpha
      n.vy += (center.y - n.y) * CLUSTER_STRENGTH * alpha
    }
  }
  // d3-force calls force.initialize(nodes) when assigned.
  force.initialize = (nodes: ClusterableNode[]) => { internalNodes = nodes }
  return force
}

// Node painting ---------------------------------------------------------------

function nodeBaseRadius(node: Pick<GraphNode, 'type' | 'degree'>): number {
  // People are the most important category — they get the biggest base + cap.
  const base = node.type === 'person' ? 12 : 10
  const max = node.type === 'person' ? 26 : 22
  return Math.min(max, base + Math.sqrt(Math.max(0, node.degree)) * 2.5)
}

function paintCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string | null) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = 1.5
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function paintDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string | null) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = 1.5
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function paintHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string | null) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6
    const px = x + r * Math.cos(a)
    const py = y + r * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = 1.5
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function paintRoundedSquare(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke: string | null) {
  const s = r * 1.6
  const rad = Math.min(4, s / 4)
  ctx.beginPath()
  ctx.roundRect(x - s / 2, y - s / 2, s, s, rad)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineWidth = 1.5
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function paintShape(ctx: CanvasRenderingContext2D, node: GraphNode, x: number, y: number, r: number, fill: string, stroke: string | null) {
  switch (node.type) {
    case 'strategy':
    case 'decision':
      paintDiamond(ctx, x, y, r * 1.15, fill, stroke)
      return
    case 'technology':
      paintHexagon(ctx, x, y, r * 1.1, fill, stroke)
      return
    case 'company':
      paintRoundedSquare(ctx, x, y, r, fill, stroke)
      return
    default:
      paintCircle(ctx, x, y, r, fill, stroke)
  }
}

// Neighbor index --------------------------------------------------------------

function buildNeighborIndex(nodes: GraphNode[], links: GraphLink[]) {
  const neighbors = new Map<string, Set<string>>()
  const linkNeighbors = new Map<string, Set<string>>()
  for (const n of nodes) {
    neighbors.set(n.id, new Set())
    linkNeighbors.set(n.id, new Set())
  }
  for (const l of links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source
    const t = typeof l.target === 'object' ? l.target.id : l.target
    neighbors.get(s)?.add(t)
    neighbors.get(t)?.add(s)
    linkNeighbors.get(s)?.add(l.id)
    linkNeighbors.get(t)?.add(l.id)
  }
  return { neighbors, linkNeighbors }
}

// Component -------------------------------------------------------------------

function BrainGraphImpl(
  { nodes, links, search, hoveredId, setHoveredId, selectedId, focusedCluster, onNodeClick, onBackgroundClick }: Props,
  ref: Ref<BrainGraphHandle>,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  // Track container size.
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const update = () => {
      const rect = el.getBoundingClientRect()
      setDims({
        w: Math.max(200, Math.floor(rect.width)),
        h: Math.max(200, Math.floor(rect.height)),
      })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Configure forces once after the graph mounts: stronger repulsion to prevent
  // overlap of the larger nodes, longer link distance so connected nodes breathe,
  // and the custom cluster force on top.
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    fg.d3Force('cluster', makeClusterForce() as unknown as Parameters<typeof fg.d3Force>[1])
    const charge = fg.d3Force('charge') as { strength?: (s: number) => unknown } | undefined
    charge?.strength?.(-260)
    const link = fg.d3Force('link') as { distance?: (d: number) => unknown } | undefined
    link?.distance?.(70)
    fg.d3ReheatSimulation()
  }, [])

  const { neighbors, linkNeighbors } = useMemo(() => buildNeighborIndex(nodes, links), [nodes, links])

  const focusId = hoveredId ?? selectedId
  const focusedNeighborhood = useMemo(() => {
    if (!focusId) return null
    const set = new Set<string>([focusId])
    for (const n of neighbors.get(focusId) ?? []) set.add(n)
    return set
  }, [focusId, neighbors])
  const focusedLinkIds = useMemo(() => {
    if (!focusId) return null
    return linkNeighbors.get(focusId) ?? new Set<string>()
  }, [focusId, linkNeighbors])

  const searchLower = search.trim().toLowerCase()
  const matchesSearch = useCallback((n: GraphNode) => {
    if (!searchLower) return true
    return n.title.toLowerCase().includes(searchLower)
      || n.tags.some(t => t.toLowerCase().includes(searchLower))
  }, [searchLower])

  // Imperative handle.
  useImperativeHandle(ref, () => ({
    zoomToCluster: (id: ClusterId) => {
      const c = clusterCenter(id, CLUSTER_RADIUS)
      fgRef.current?.centerAt(c.x, c.y, 600)
      fgRef.current?.zoom(1.4, 600)
    },
    zoomToNode: (id: string) => {
      const n = nodes.find(n => n.id === id)
      if (!n || n.x == null || n.y == null) return
      fgRef.current?.centerAt(n.x, n.y, 500)
      fgRef.current?.zoom(2.2, 500)
    },
    zoomToFit: () => fgRef.current?.zoomToFit(600, 80),
  }), [nodes])

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ForceGraph2D<GraphNode, GraphLink>
        ref={fgRef}
        graphData={{ nodes, links }}
        width={dims.w}
        height={dims.h}
        backgroundColor="rgba(0,0,0,0)"
        nodeId="id"
        nodeRelSize={4}
        cooldownTicks={120}
        warmupTicks={30}
        d3AlphaDecay={0.045}
        d3VelocityDecay={0.5}
        linkSource="source"
        linkTarget="target"
        linkWidth={(l) => {
          const base = 0.5 + ((l.strength - 1) / 9) * 2.0
          if (focusId && focusedLinkIds?.has(l.id)) return base + 0.8
          return base
        }}
        linkColor={(l) => {
          if (focusId && focusedLinkIds?.has(l.id)) return 'rgba(255, 198, 85, 0.55)'
          if (focusId) return 'rgba(255, 255, 255, 0.04)'
          if (focusedCluster) {
            const s = typeof l.source === 'object' ? l.source : nodes.find(n => n.id === l.source)
            const t = typeof l.target === 'object' ? l.target : nodes.find(n => n.id === l.target)
            if (s?.cluster === focusedCluster || t?.cluster === focusedCluster) return 'rgba(255,255,255,0.22)'
            return 'rgba(255,255,255,0.04)'
          }
          return 'rgba(255, 255, 255, 0.08)'
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as GraphNode
          const isSelected = n.id === selectedId
          const isHovered = n.id === hoveredId
          const inFocusNbhd = !focusedNeighborhood || focusedNeighborhood.has(n.id)
          const matches = matchesSearch(n)
          const inFocusedCluster = !focusedCluster || n.cluster === focusedCluster
          const dim = (focusedNeighborhood && !inFocusNbhd)
            || (!!searchLower && !matches)
            || (!!focusedCluster && !inFocusedCluster)

          const radius = nodeBaseRadius(n)
          const baseColor = colorFor(n)
          const fill = dim ? hexWithAlpha(baseColor, 0.18) : baseColor
          const stroke = isSelected ? '#FFC655' : isHovered ? 'rgba(255, 198, 85, 0.7)' : null

          // Selection halo.
          if (isSelected) {
            ctx.beginPath()
            ctx.arc(n.x ?? 0, n.y ?? 0, radius + 8, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255, 198, 85, 0.10)'
            ctx.fill()
          }

          paintShape(ctx, n, n.x ?? 0, n.y ?? 0, radius, fill, stroke)

          // Labels: always show all (graph is small enough). Offset slightly below the node.
          if (!dim) {
            const fontSize = Math.max(13 / globalScale, 3)
            ctx.font = `${isSelected || isHovered ? '600 ' : '500 '}${fontSize}px Inter, system-ui, sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            const label = n.title
            const ty = (n.y ?? 0) + radius + 6 / globalScale
            // Strong shadow so labels stay legible over edges or dot pattern.
            ctx.save()
            ctx.shadowColor = 'rgba(0,0,0,1)'
            ctx.shadowBlur = 6
            ctx.fillStyle = 'rgba(0,0,0,0.9)'
            // Draw three times to build up the outline shadow.
            ctx.fillText(label, n.x ?? 0, ty)
            ctx.fillText(label, n.x ?? 0, ty)
            ctx.fillStyle = 'rgba(255,255,255,0.96)'
            ctx.fillText(label, n.x ?? 0, ty)
            ctx.restore()
          }
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as GraphNode
          const r = nodeBaseRadius(n) + 3
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2)
          ctx.fill()
        }}
        nodeLabel={(n) => `${n.title} · ${n.type} · ${n.degree} connection${n.degree === 1 ? '' : 's'}`}
        onNodeClick={(n) => onNodeClick(n as GraphNode)}
        onNodeHover={(n) => setHoveredId(n ? (n as GraphNode).id : null)}
        onNodeDragEnd={(n) => {
          // Pin the node in place after a manual drag so users can lay out the graph.
          const node = n as GraphNode & { fx?: number; fy?: number }
          node.fx = node.x
          node.fy = node.y
        }}
        onBackgroundClick={onBackgroundClick}
        onNodeRightClick={(n) => {
          // Right-click un-pins a dragged node.
          const node = n as GraphNode & { fx?: number | null; fy?: number | null }
          node.fx = null
          node.fy = null
        }}
        enableZoomInteraction
        enablePanInteraction
        minZoom={0.3}
        maxZoom={6}
      />
    </div>
  )
}

const BrainGraph = forwardRef<BrainGraphHandle, Props>(BrainGraphImpl)
BrainGraph.displayName = 'BrainGraph'
export default BrainGraph

// --- helpers -----------------------------------------------------------------

function hexWithAlpha(hex: string, alpha: number): string {
  // Accept #RGB or #RRGGBB.
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

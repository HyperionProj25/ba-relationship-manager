'use client'

import { useEffect, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { BrainNodeType } from '@/types'

export interface GraphNode {
  id: string
  title: string
  type: BrainNodeType
  body: string | null
  tags: string[]
  contact_id: string | null
  updated_at: string
  created_at: string
  degree: number
  // d3 mutable
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

interface Props {
  nodes: GraphNode[]
  links: GraphLink[]
  colorByType: Record<BrainNodeType, string>
  search: string
  hiddenTypes: Set<BrainNodeType>
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  onNodeClick: (node: GraphNode) => void
  selectedId: string | null
}

function neighborSets(nodes: GraphNode[], links: GraphLink[]): { neighbors: Map<string, Set<string>>; linkNeighbors: Map<string, Set<string>> } {
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

export default function BrainGraph({
  nodes,
  links,
  colorByType,
  search,
  hiddenTypes,
  hoveredId,
  setHoveredId,
  onNodeClick,
  selectedId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 800, h: 600 })

  // Track container size for the graph canvas.
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

  const { neighbors, linkNeighbors } = neighborSets(nodes, links)

  const visibleNodeIds = new Set(nodes.filter(n => !hiddenTypes.has(n.type)).map(n => n.id))
  const filteredNodes = nodes.filter(n => visibleNodeIds.has(n.id))
  const filteredLinks = links.filter(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source
    const t = typeof l.target === 'object' ? l.target.id : l.target
    return visibleNodeIds.has(s) && visibleNodeIds.has(t)
  })

  const searchLower = search.trim().toLowerCase()
  const focusId = hoveredId ?? selectedId
  const focusedNeighborhood = focusId ? new Set([focusId, ...(neighbors.get(focusId) ?? [])]) : null
  const focusedLinkIds = focusId ? (linkNeighbors.get(focusId) ?? new Set()) : new Set<string>()

  const matchesSearch = (node: GraphNode) => {
    if (!searchLower) return true
    return node.title.toLowerCase().includes(searchLower)
      || (node.tags ?? []).some(t => t.toLowerCase().includes(searchLower))
  }

  const data = { nodes: filteredNodes, links: filteredLinks }

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ForceGraph2D
        graphData={data}
        width={dims.w}
        height={dims.h}
        backgroundColor="#000000"
        nodeId="id"
        nodeRelSize={4}
        nodeVal={(n: GraphNode) => (n.degree >= 3 ? 10 : 6)}
        nodeColor={(n: GraphNode) => colorByType[n.type] ?? '#888'}
        linkSource="source"
        linkTarget="target"
        linkWidth={(l: GraphLink) => {
          // Map strength 1..10 → 0.5..3 px
          const base = 0.5 + ((l.strength - 1) / 9) * 2.5
          if (focusId && focusedLinkIds.has(l.id)) return base + 1
          return base
        }}
        linkColor={(l: GraphLink) => {
          if (focusId && focusedLinkIds.has(l.id)) return 'rgba(255, 198, 85, 0.6)'
          if (focusId) return 'rgba(255, 255, 255, 0.04)'
          return 'rgba(255, 255, 255, 0.15)'
        }}
        nodeCanvasObjectMode={() => 'after'}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as GraphNode
          const label = n.title
          const isSelected = n.id === selectedId
          const isHovered = n.id === hoveredId
          const isInFocus = !focusedNeighborhood || focusedNeighborhood.has(n.id)
          const matches = matchesSearch(n)
          const dim = (focusedNeighborhood && !isInFocus) || (!!searchLower && !matches)

          // Selection / hover ring
          if (isSelected || isHovered) {
            const radius = (n.degree >= 3 ? 10 : 6) + 3
            ctx.beginPath()
            ctx.arc(n.x ?? 0, n.y ?? 0, radius, 0, 2 * Math.PI, false)
            ctx.strokeStyle = isSelected ? '#FFC655' : 'rgba(255, 198, 85, 0.5)'
            ctx.lineWidth = 1.5 / globalScale
            ctx.stroke()
          }

          // Label
          const fontSize = Math.max(10 / globalScale, 2)
          ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          ctx.fillStyle = dim ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.92)'
          const radius = n.degree >= 3 ? 10 : 6
          // Render the label only if zoomed in enough or it's highlighted, to reduce visual noise.
          if (globalScale > 1.2 || isSelected || isHovered || (searchLower && matches)) {
            ctx.fillText(label, n.x ?? 0, (n.y ?? 0) + radius / 2 + 4 / globalScale)
          }
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const n = node as GraphNode
          const radius = n.degree >= 3 ? 10 : 6
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(n.x ?? 0, n.y ?? 0, radius + 2, 0, 2 * Math.PI, false)
          ctx.fill()
        }}
        nodeLabel={(n: GraphNode) => `${n.title}\n${n.type}`}
        onNodeClick={(n) => onNodeClick(n as GraphNode)}
        onNodeHover={(n) => setHoveredId(n ? (n as GraphNode).id : null)}
        cooldownTicks={120}
        warmupTicks={20}
      />
    </div>
  )
}

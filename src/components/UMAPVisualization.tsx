'use client'

import { useEffect, useRef, useState, memo, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { UMAP } from 'umap-js'

interface Entry {
  id: string
  data: string
  metadata: any
  embedding: number[]
  createdAt: string
  updatedAt: string
  collection: string
  parentId?: string
  comments?: Entry[]
}

interface UMAPVisualizationProps {
  entries: Entry[]
  collection: string
  onNodeClick: (entry: Entry) => void
  onCollectionChange: (collection: string) => void
  collections: string[]
  newlyAddedEntryId?: string
}

function UMAPVisualization({
  entries,
  collection,
  onNodeClick,
  onCollectionChange,
  collections,
  newlyAddedEntryId,
}: UMAPVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoize entry IDs to prevent unnecessary re-renders
  const entryIds = useMemo(() => entries.map(e => e.id).join(','), [entries])
  const entryCount = entries.length

  // Throttled zoom handler for better performance
  const handleZoom = useCallback((event: any, g: d3.Selection<SVGGElement, unknown, null, undefined>) => {
    // Clear existing timeout
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current)
    }

    // Apply transform immediately for responsiveness
    g.attr('transform', event.transform)

    // Throttle additional processing
    zoomTimeoutRef.current = setTimeout(() => {
      // Any heavy zoom-dependent operations can go here if needed
    }, 16) // ~60fps
  }, [])

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => {
      window.removeEventListener('resize', updateDimensions)
      // Cleanup zoom timeout
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!svgRef.current || !entries.length || !dimensions.width) return

    console.log('UMAP visualization effect triggered with', entries.length, 'entries')

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Add arrowhead marker definition (must be added after clearing)
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-5 -5 10 10')
      .attr('refX', 5)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0,0 L -5,-3 L -5,3 z')
      .attr('fill', '#94a3b8')

    // Flatten entries to include comments as separate nodes
    const allEntries: Entry[] = []
    entries.forEach(entry => {
      // Add main entry
      allEntries.push(entry)

      // Add all comments as separate entries
      if (entry.comments && entry.comments.length > 0) {
        entry.comments.forEach(comment => {
          allEntries.push(comment)
        })
      }
    })

    console.log(`Flattened ${entries.length} main entries into ${allEntries.length} total entries (including comments)`)

    if (allEntries.length === 0) {
      // Show message when no entries
      svg.append('text')
        .attr('x', dimensions.width / 2)
        .attr('y', dimensions.height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'gray')
        .attr('font-size', '18px')
        .text(`No entries found in collection: ${collection}`)
      return
    }

    // Handle single entry case - just center it
    if (allEntries.length === 1) {
      const g = svg.append('g')

      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2

      const entry = allEntries[0]
      const node = g.append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${centerX}, ${centerY})`)
        .style('cursor', 'pointer')
        .on('click', () => onNodeClick(entry))

      // Draw based on entry type
      if (entry.metadata.type === 'image') {
        node.append('rect')
          .attr('x', -12)
          .attr('y', -12)
          .attr('width', 24)
          .attr('height', 24)
          .attr('fill', '#f59e0b')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .attr('rx', 4)

        if (entry.metadata.imageFile) {
          node.append('image')
            .attr('x', -10)
            .attr('y', -10)
            .attr('width', 20)
            .attr('height', 20)
            .attr('href', `/images/${entry.metadata.imageFile}`)
            .attr('clip-path', 'inset(0% round 2px)')
        }
      } else if (entry.metadata.type === 'audio') {
        node.append('circle')
          .attr('r', 12)
          .attr('fill', '#10b981')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)

        node.append('polygon')
          .attr('points', '-4,-6 -4,6 6,0')
          .attr('fill', '#fff')
      } else {
        node.append('circle')
          .attr('r', 8)
          .attr('fill', '#3b82f6')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      }

      // Add hover effects
      node.on('mouseenter', function(event) {
        d3.select(this).select('circle, rect').attr('stroke-width', 4)

        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px 12px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('max-width', '200px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .text(entry.data.substring(0, 100) + (entry.data.length > 100 ? '...' : ''))

        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY + 10) + 'px')
      })
      .on('mouseleave', function() {
        d3.select(this).select('circle, rect').attr('stroke-width', 2)
        d3.selectAll('.tooltip').remove()
      })

      // Add text indicating single entry
      svg.append('text')
        .attr('x', dimensions.width / 2)
        .attr('y', dimensions.height - 50)
        .attr('text-anchor', 'middle')
        .attr('fill', 'gray')
        .attr('font-size', '14px')
        .text('Single entry - add more entries to see UMAP clustering')

      return
    }

    // Apply UMAP positioning similar to your working project
    const applyUMAPPositioning = (entries: Entry[]) => {
      console.log('UMAP positioning called with', entries.length, 'entries')

      if (entries.length < 2) {
        console.log('Not enough entries, using centered position')
        return entries.map((entry, index) => ({
          entry,
          position: [0, 0] as [number, number]
        }))
      }

      // Extract embeddings (they come as arrays from the API)
      const validEntries: Entry[] = []
      const validEmbeddings: number[][] = []

      entries.forEach((entry, index) => {
        const embedding = entry.embedding

        console.log(`Entry ${entry.id}: embedding type=${typeof embedding}, isArray=${Array.isArray(embedding)}, length=${Array.isArray(embedding) ? embedding.length : 'N/A'}`)

        if (!Array.isArray(embedding) || embedding.length === 0) {
          console.warn(`Entry ${entry.id}: Invalid embedding - not an array or empty`, {
            type: typeof embedding,
            isArray: Array.isArray(embedding),
            length: embedding?.length,
            sample: embedding?.slice?.(0, 3)
          })
          return
        }

        // Validate that all values are numbers
        const validEmb = embedding.filter(val => typeof val === 'number' && !isNaN(val))
        if (validEmb.length !== embedding.length) {
          console.warn(`Entry ${entry.id}: filtered ${embedding.length - validEmb.length} invalid values from embedding`)
        }

        if (validEmb.length > 0) {
          console.log(`Entry ${entry.id}: Using embedding with ${validEmb.length} dimensions, sample:`, validEmb.slice(0, 5))
          validEntries.push(entry)
          validEmbeddings.push(validEmb)
        } else {
          console.warn(`Entry ${entry.id}: No valid embedding values`)
        }
      })

      console.log(`Using ${validEntries.length} entries with valid embeddings out of ${entries.length} total`)
      console.log('Embedding matrix size:', validEmbeddings.length, 'x', validEmbeddings[0]?.length)

      if (validEmbeddings.length < 2) {
        console.log('Not enough valid embeddings, using manual positioning')
        return entries.map((entry, index) => ({
          entry,
          position: [index * 100 - 50, 0] as [number, number]
        }))
      }

      // For 2 entries, use simple positioning
      if (validEmbeddings.length === 2) {
        return [
          { entry: validEntries[0], position: [-1, 0] as [number, number] },
          { entry: validEntries[1], position: [1, 0] as [number, number] }
        ]
      }

      // 2D UMAP parameters optimized for better spread
      const umap = new UMAP({
        nComponents: 2,
        nNeighbors: Math.min(10, Math.max(2, Math.floor(validEmbeddings.length * 0.15))),
        minDist: 0.3, // Increased for more spread
        spread: 2.0,  // Increased for more spread
        nEpochs: 200, // Reduced epochs to avoid infinite loops
        learningRate: 1.0,
        random: Math.random, // Use proper random function
      })

      console.log('Starting UMAP fit with real embeddings...')
      console.log('UMAP config:', {
        nComponents: 2,
        nNeighbors: Math.min(10, Math.max(2, Math.floor(validEmbeddings.length * 0.15))),
        minDist: 0.3,
        spread: 2.0,
        embeddingCount: validEmbeddings.length,
        embeddingDims: validEmbeddings[0]?.length
      })

      let positions
      try {
        positions = umap.fit(validEmbeddings) // Use the REAL embeddings
        console.log('UMAP SUCCESS! Generated positions:', positions.length, 'First 3 positions:', positions.slice(0, 3))

        // Verify the positions look reasonable
        const xValues = positions.map(p => p[0])
        const yValues = positions.map(p => p[1])
        console.log('Position ranges:', {
          x: [Math.min(...xValues), Math.max(...xValues)],
          y: [Math.min(...yValues), Math.max(...yValues)]
        })
        console.log('First 3 actual positions:')
        positions.slice(0, 3).forEach((pos, i) => {
          console.log(`  Position ${i}: [${pos[0]}, ${pos[1]}]`)
        })

      } catch (error) {
        console.error('UMAP failed, using fallback positioning:', error)
        // Fallback to circle layout
        return validEntries.map((entry, index) => {
          const angle = (index / validEntries.length) * 2 * Math.PI
          return {
            entry,
            position: [Math.cos(angle), Math.sin(angle)] as [number, number]
          }
        })
      }

      // Return positioned entries (only those with valid embeddings)
      const positionedEntries = validEntries.map((entry, index) => ({
        entry,
        position: positions[index] || [0, 0] as [number, number]
      }))

      // Add entries without valid embeddings at random positions
      const remainingEntries = entries.filter(entry =>
        !validEntries.some(validEntry => validEntry.id === entry.id)
      )

      remainingEntries.forEach((entry, index) => {
        const angle = (index / remainingEntries.length) * 2 * Math.PI
        positionedEntries.push({
          entry,
          position: [Math.cos(angle) * 3, Math.sin(angle) * 3] as [number, number] // Place further out
        })
      })

      return positionedEntries
    }

    // Get positioned entries
    const positionedEntries = applyUMAPPositioning(allEntries)

    console.log(`UMAP returned ${positionedEntries.length} positioned entries for ${allEntries.length} total entries`)

    // Create a position lookup map by entry ID
    const positionMap = new Map<string, [number, number]>()
    positionedEntries.forEach(p => {
      positionMap.set(p.entry.id, p.position)
    })

    // Ensure we have positions for all entries, using fallback for missing ones
    const umapResult: [number, number][] = allEntries.map((entry, index) => {
      const position = positionMap.get(entry.id)
      if (position) {
        return position
      } else {
        console.warn(`No UMAP position found for entry ${entry.id}, using fallback position`)
        // Fallback: place in a circle around origin
        const angle = (index / allEntries.length) * 2 * Math.PI
        return [Math.cos(angle) * 2, Math.sin(angle) * 2] as [number, number]
      }
    })

    // Create scales
    const xExtent = d3.extent(umapResult, d => d[0]) as [number, number]
    const yExtent = d3.extent(umapResult, d => d[1]) as [number, number]

    const xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([100, dimensions.width - 100])

    const yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([100, dimensions.height - 100])

    // Create color scale for different entry types
    const colorScale = d3.scaleOrdinal()
      .domain(['text', 'audio', 'image'])
      .range(['#3b82f6', '#10b981', '#f59e0b'])

    // Create main group with zoom/pan behavior
    const g = svg.append('g')

    // Add zoom and pan behavior with performance optimization
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10]) // Allow zoom from 10% to 1000%
      .on('zoom', (event) => {
        handleZoom(event, g)
      })

    // Apply zoom behavior to SVG with optimization
    svg.call(zoom)
      .on('wheel.zoom', (event) => {
        // Prevent default wheel behavior for smoother zooming
        event.preventDefault()
      })

    // Add zoom controls hint (fixed position, not affected by zoom)
    svg.append('text')
      .attr('x', 10)
      .attr('y', dimensions.height - 10)
      .attr('fill', 'gray')
      .attr('font-size', '12px')
      .text('Drag to pan • Scroll to zoom')

    // Draw lines connecting comments to their parent entries
    allEntries.forEach((entry, entryIndex) => {
      if (entry.parentId) {
        const parentIndex = allEntries.findIndex(e => e.id === entry.parentId)
        if (parentIndex >= 0 && umapResult[parentIndex] && umapResult[entryIndex]) {
          const [parentX, parentY] = umapResult[parentIndex]
          const [commentX, commentY] = umapResult[entryIndex]

          g.append('line')
            .attr('x1', xScale(parentX))
            .attr('y1', yScale(parentY))
            .attr('x2', xScale(commentX))
            .attr('y2', yScale(commentY))
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '3,3')
            .attr('marker-end', 'url(#arrowhead)')
        }
      }
    })

    // Draw nodes for all entries (including comments)
    const nodes = g.selectAll('.node')
      .data(allEntries.map((entry, i) => ({ entry, position: umapResult[i] })).filter(d => d.position))
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => {
        if (!d.position || d.position[0] === undefined || d.position[1] === undefined) {
          console.error('Invalid position for entry', d.entry.id, d.position)
          return 'translate(0, 0)'
        }
        return `translate(${xScale(d.position[0])}, ${yScale(d.position[1])})`
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => onNodeClick(d.entry))

    // Draw circles for text entries (including text comments)
    nodes.filter(d => !d.entry.metadata.type || d.entry.metadata.type === 'text')
      .append('circle')
      .attr('r', d => d.entry.parentId ? 6 : 8) // Smaller for comments
      .attr('fill', d => colorScale('text') as string)
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', d => d.entry.id === newlyAddedEntryId ? 4 : 2)

    // Draw rectangles with thumbnails for image entries
    const imageNodes = nodes.filter(d => d.entry.metadata.type === 'image')

    imageNodes.append('rect')
      .attr('x', d => d.entry.parentId ? -10 : -12) // Smaller for comments
      .attr('y', d => d.entry.parentId ? -10 : -12)
      .attr('width', d => d.entry.parentId ? 20 : 24)
      .attr('height', d => d.entry.parentId ? 20 : 24)
      .attr('fill', d => colorScale('image') as string)
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', d => d.entry.id === newlyAddedEntryId ? 4 : 2)
      .attr('rx', 4)

    imageNodes.append('image')
      .attr('x', d => d.entry.parentId ? -8 : -10)
      .attr('y', d => d.entry.parentId ? -8 : -10)
      .attr('width', d => d.entry.parentId ? 16 : 20)
      .attr('height', d => d.entry.parentId ? 16 : 20)
      .attr('href', d => `/images/${d.entry.metadata.imageFile}`)
      .attr('clip-path', 'inset(0% round 2px)')
      .attr('opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments

    // Draw circles with play icon for audio entries
    const audioNodes = nodes.filter(d => d.entry.metadata.type === 'audio')

    audioNodes.append('circle')
      .attr('r', d => d.entry.parentId ? 10 : 12) // Smaller for comments
      .attr('fill', d => colorScale('audio') as string)
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', d => d.entry.id === newlyAddedEntryId ? 4 : 2)

    audioNodes.append('polygon')
      .attr('points', d => d.entry.parentId ? '-3,-4 -3,4 4,0' : '-4,-6 -4,6 6,0') // Smaller play icon for comments
      .attr('fill', '#fff')
      .attr('opacity', d => d.entry.parentId ? 0.8 : 1)

    // Add hover effects with performance optimization
    nodes.on('mouseenter', function(event, d) {
      // Use requestAnimationFrame for hover effects
      requestAnimationFrame(() => {
        d3.select(this).select('circle, rect').attr('stroke-width', 4)

        // Show tooltip with debouncing
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px 12px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('max-width', '200px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .style('transform', 'translateZ(0)') // GPU acceleration for tooltip
          .text(d.entry.data.substring(0, 100) + (d.entry.data.length > 100 ? '...' : ''))

        tooltip.style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY + 10) + 'px')
      })
    })
    .on('mouseleave', function() {
      requestAnimationFrame(() => {
        d3.select(this).select('circle, rect').attr('stroke-width', d => d.entry.id === newlyAddedEntryId ? 4 : 2)
        d3.selectAll('.tooltip').remove()
      })
    })

  }, [entryCount, entryIds, dimensions.width, dimensions.height, collection])

  return (
    <div className="relative w-full h-full">
      {/* Collection name and dropdown */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">
          {collection}
        </h1>
        <select
          value={collection}
          onChange={(e) => onCollectionChange(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded bg-background text-foreground text-sm"
        >
          {collections.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      {/* SVG visualization */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)', // Force GPU acceleration
        }}
      />
    </div>
  )
}

export default memo(UMAPVisualization)
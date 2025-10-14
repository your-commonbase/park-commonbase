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
  onGraphClick?: () => void
}

function UMAPVisualization({
  entries,
  collection,
  onNodeClick,
  onCollectionChange,
  collections,
  newlyAddedEntryId,
  onGraphClick,
}: UMAPVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; alt: string } | null>(null)

  // Handle escape key for closing modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null)
      }
    }

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [fullscreenImage])

  // Check display mode from localStorage, window object, or environment variable
  const getDisplayMode = () => {
    if (typeof window !== 'undefined') {
      // Check runtime setting first
      const runtimeMode = (window as typeof window & { NEXT_PUBLIC_GRAPH_DISPLAY_MODE?: string }).NEXT_PUBLIC_GRAPH_DISPLAY_MODE
      if (runtimeMode) return runtimeMode

      // Check localStorage
      const savedMode = localStorage.getItem('graphDisplayMode')
      if (savedMode) return savedMode

      // Default based on device
      const isMobile = window.innerWidth <= 768
      return isMobile ? 'tooltip' : 'text'
    }
    return process.env.NEXT_PUBLIC_GRAPH_DISPLAY_MODE || 'tooltip'
  }

  const [displayMode, setDisplayMode] = useState(getDisplayMode())

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Helper function to add hover effects based on display mode
  const addHoverEffects = (nodes: d3.Selection<SVGGElement, any, SVGGElement, unknown>) => {
    // Check if we're on mobile to disable tooltips
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    if (displayMode === 'tooltip' && !isMobile) {
      // Tooltip mode - show on hover (disabled on mobile)
      nodes.on('mouseenter', function(event, d) {
        requestAnimationFrame(() => {
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
            .style('transform', 'translateZ(0)')
            .text(truncateText(d.entry.data))

          tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px')
        })
      })
      .on('mouseleave', function(event, d) {
        requestAnimationFrame(() => {
          d3.select(this).select('circle, rect').attr('stroke-width', d.entry.id === newlyAddedEntryId ? 4 : 2)
          d3.selectAll('.tooltip').remove()
        })
      })
    } else {
      // Text mode OR mobile - just highlight on hover, no tooltips
      nodes.on('mouseenter', function(event, d) {
        d3.select(this).select('circle, rect').attr('stroke-width', 4)
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('circle, rect').attr('stroke-width', d.entry.id === newlyAddedEntryId ? 4 : 2)
      })
    }
  }

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

    // Listen for display mode changes
    const checkDisplayModeChanges = () => {
      const newMode = getDisplayMode()
      if (newMode !== displayMode) {
        setDisplayMode(newMode)
      }
    }

    // Check periodically for changes
    const intervalId = setInterval(checkDisplayModeChanges, 100)

    return () => {
      window.removeEventListener('resize', updateDimensions)
      clearInterval(intervalId)
      // Cleanup zoom timeout
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current)
      }
    }
  }, [displayMode])

  // Apply UMAP positioning similar to your working project (moved outside useEffect for memoization)
  const applyUMAPPositioning = useCallback((entries: Entry[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('UMAP positioning called with', entries.length, 'entries')
      }

      if (entries.length < 2) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Not enough entries, using centered position')
        }
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

      // 2D UMAP parameters optimized for performance and spread
      const umap = new UMAP({
        nComponents: 2,
        nNeighbors: Math.min(8, Math.max(2, Math.floor(validEmbeddings.length * 0.1))),
        minDist: 0.3, // Increased for more spread
        spread: 2.0,  // Increased for more spread
        nEpochs: Math.min(100, Math.max(50, validEmbeddings.length * 2)), // Adaptive epochs for performance
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
    }, []) // No dependencies since this is a pure function

  // Extract dependencies for memoization
  const entryIds = useMemo(() => entries.map(e => e.id).join(','), [entries])
  const commentCounts = useMemo(() => entries.map(e => e.comments?.length || 0).join(','), [entries])

  // Memoize UMAP positioning to avoid recalculation on every render
  const positionedEntries = useMemo(() => {
    if (!entries.length) return []

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

    if (process.env.NODE_ENV === 'development') {
      console.log('UMAP positioning memoized calculation with', entries.length, 'entries, flattened to', allEntries.length)
      console.log('Entry IDs:', allEntries.map(e => e.id).slice(0, 5)) // Log first 5 IDs for debugging
    }
    return applyUMAPPositioning(allEntries)
  }, [entries.length, entryIds, commentCounts, applyUMAPPositioning]) // Recalculate when entries, IDs, or comments change

  // Always expose current UMAP positions to window for export functionality
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getCurrentUMAPPositions = () => {
        console.log('getCurrentUMAPPositions called, returning', positionedEntries.length, 'entries')
        return positionedEntries
      }
    }
  }, [positionedEntries]) // Update whenever positionedEntries changes

  useEffect(() => {
    if (!svgRef.current || !positionedEntries.length || !dimensions.width) return

    console.log('UMAP visualization rendering with', positionedEntries.length, 'positioned entries')

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

    if (positionedEntries.length === 0) {
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
    if (positionedEntries.length === 1) {
      const g = svg.append('g')

      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2

      const entry = positionedEntries[0].entry
      const node = g.append('g')
        .attr('class', 'node')
        .attr('transform', `translate(${centerX}, ${centerY})`)
        .style('cursor', 'pointer')
        .on('click', () => onNodeClick(entry))

      // Draw based on entry type
      if (entry.metadata.type === 'image') {
        node.append('circle')
          .attr('r', 12)
          .attr('fill', '#f59e0b')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)

        // Add image icon
        node.append('rect')
          .attr('x', -6)
          .attr('y', -6)
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', '#fff')
          .attr('rx', 2)

        node.append('circle')
          .attr('cx', -2)
          .attr('cy', -2)
          .attr('r', 2)
          .attr('fill', '#f59e0b')

        node.append('polygon')
          .attr('points', '-6,2 -2,-2 2,2 6,6 -6,6')
          .attr('fill', '#f59e0b')
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

      // Add text labels if in text mode
      if (displayMode === 'text') {
        node.append('text')
          .attr('x', 0)
          .attr('y', entry.metadata.type === 'image' ? 30 : 25)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('fill', '#333')
          .attr('font-weight', 'bold')
          .style('pointer-events', 'none')
          .style('user-select', 'none')
          .text(truncateText(entry.data, 50))
      }

      // Add hover effects based on display mode
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
      if (displayMode === 'tooltip' && !isMobile) {
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
            .text(truncateText(entry.data))

          tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px')
        })
        .on('mouseleave', function() {
          d3.select(this).select('circle, rect').attr('stroke-width', 2)
          d3.selectAll('.tooltip').remove()
        })
      } else {
        node.on('mouseenter', function() {
          d3.select(this).select('circle, rect').attr('stroke-width', 4)
        })
        .on('mouseleave', function() {
          d3.select(this).select('circle, rect').attr('stroke-width', 2)
        })
      }

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

    // Extract positions and entries from memoized positioned entries
    const umapResult = positionedEntries.map(({ position }) => position as [number, number])
    const flattenedEntries = positionedEntries.map(({ entry }) => entry)

    console.log(`Using ${positionedEntries.length} positioned entries`)

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
      .domain(['text', 'audio', 'image', 'youtube', 'spotify'])
      .range(['#3b82f6', '#10b981', '#f59e0b', '#ff0000', '#1ed760'])

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
    flattenedEntries.forEach((entry, entryIndex) => {
      if (entry.parentId) {
        const parentIndex = flattenedEntries.findIndex(e => e.id === entry.parentId)
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
      .data(flattenedEntries.map((entry, i) => ({ entry, position: umapResult[i] })).filter(d => d.position))
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
      .on('click', (event, d) => {
        if (d.entry.metadata.type === 'image') {
          // Open fullscreen image modal for image entries
          const imageUrl = d.entry.metadata.imageUrl || `/images/${d.entry.metadata.imageFile}`
          setFullscreenImage({ url: imageUrl, alt: d.entry.data })
        } else {
          // Regular node click behavior for non-image entries
          onNodeClick(d.entry)
        }
      })

    // Draw circles for text entries (including text comments)
    nodes.filter(d => !d.entry.metadata.type || d.entry.metadata.type === 'text')
      .append('circle')
      .attr('r', d => d.entry.parentId ? 6 : 8) // Smaller for comments
      .attr('fill', d => colorScale('text') as string)
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', (d: any) => d.entry.id === newlyAddedEntryId ? 4 : 2)

    // Draw orange circles for image entries
    const imageNodes = nodes.filter(d => d.entry.metadata.type === 'image')

    imageNodes.append('circle')
      .attr('r', d => d.entry.parentId ? 10 : 12) // Smaller for comments
      .attr('fill', '#f59e0b') // Orange color
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', (d: any) => d.entry.id === newlyAddedEntryId ? 4 : 2)

    // Add simple image icon (rectangle with smaller rectangle inside)
    imageNodes.append('rect')
      .attr('x', d => d.entry.parentId ? -4 : -5)
      .attr('y', d => d.entry.parentId ? -4 : -5)
      .attr('width', d => d.entry.parentId ? 8 : 10)
      .attr('height', d => d.entry.parentId ? 6 : 8)
      .attr('fill', 'none')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('rx', 1)
      .attr('opacity', d => d.entry.parentId ? 0.8 : 1)

    // Add a small circle in top-right corner to represent image
    imageNodes.append('circle')
      .attr('cx', d => d.entry.parentId ? 1 : 2)
      .attr('cy', d => d.entry.parentId ? -2 : -2)
      .attr('r', d => d.entry.parentId ? 1 : 1.5)
      .attr('fill', '#fff')
      .attr('opacity', d => d.entry.parentId ? 0.8 : 1)

    // Draw circles with play icon for audio entries
    const audioNodes = nodes.filter(d => d.entry.metadata.type === 'audio')

    audioNodes.append('circle')
      .attr('r', d => d.entry.parentId ? 10 : 12) // Smaller for comments
      .attr('fill', d => colorScale('audio') as string)
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', (d: any) => d.entry.id === newlyAddedEntryId ? 4 : 2)

    audioNodes.append('polygon')
      .attr('points', d => d.entry.parentId ? '-3,-4 -3,4 4,0' : '-4,-6 -4,6 6,0') // Smaller play icon for comments
      .attr('fill', '#fff')
      .attr('opacity', d => d.entry.parentId ? 0.8 : 1)

    // Draw YouTube nodes (rounded rectangles with play icon)
    const youtubeNodes = nodes.filter(d => d.entry.metadata.type === 'youtube')

    youtubeNodes.append('rect')
      .attr('x', d => d.entry.parentId ? -10 : -12)
      .attr('y', d => d.entry.parentId ? -6 : -8)
      .attr('width', d => d.entry.parentId ? 20 : 24)
      .attr('height', d => d.entry.parentId ? 12 : 16)
      .attr('fill', d => colorScale('youtube') as string)
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1)
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', (d: any) => d.entry.id === newlyAddedEntryId ? 4 : 2)
      .attr('rx', 2)

    youtubeNodes.append('polygon')
      .attr('points', d => d.entry.parentId ? '-3,-2 -3,2 2,0' : '-4,-3 -4,3 3,0')
      .attr('fill', '#fff')
      .attr('opacity', d => d.entry.parentId ? 0.8 : 1)

    // Draw Spotify nodes (circles with music note-like icon)
    const spotifyNodes = nodes.filter(d => d.entry.metadata.type === 'spotify')

    spotifyNodes.append('circle')
      .attr('r', d => d.entry.parentId ? 10 : 12)
      .attr('fill', d => colorScale('spotify') as string)
      .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1)
      .attr('stroke', d => d.entry.id === newlyAddedEntryId ? '#ff6b35' : '#fff')
      .attr('stroke-width', (d: any) => d.entry.id === newlyAddedEntryId ? 4 : 2)

    spotifyNodes.append('path')
      .attr('d', d => d.entry.parentId ?
        'M-2,-3 C-2,-4 -1,-5 0,-5 C1,-5 2,-4 2,-3 C2,-1 1,0 0,0 C-1,0 -2,-1 -2,-3 M0,0 L0,4 M-1,3 L1,3' :
        'M-3,-4 C-3,-5 -2,-6 0,-6 C2,-6 3,-5 3,-4 C3,-1 2,1 0,1 C-2,1 -3,-1 -3,-4 M0,1 L0,5 M-2,4 L2,4'
      )
      .attr('fill', '#fff')
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('opacity', d => d.entry.parentId ? 0.8 : 1)

    // Add interaction effects based on display mode
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
    if (displayMode === 'tooltip' && !isMobile) {
      // Add hover effects with performance optimization for tooltip mode (disabled on mobile)
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
            .text(truncateText(d.entry.data))

          tooltip.style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY + 10) + 'px')
        })
      })
      .on('mouseleave', function() {
        requestAnimationFrame(() => {
          d3.select(this).select('circle, rect').attr('stroke-width', (d: any) => d.entry.id === newlyAddedEntryId ? 4 : 2)
          d3.selectAll('.tooltip').remove()
        })
      })
    } else {
      // Add simple hover effects for text mode OR mobile (no tooltip)
      nodes.on('mouseenter', function() {
        d3.select(this).select('circle, rect').attr('stroke-width', 4)
      })
      .on('mouseleave', function() {
        d3.select(this).select('circle, rect').attr('stroke-width', (d: any) => d.entry.id === newlyAddedEntryId ? 4 : 2)
      })
    }

    // Add text labels for text nodes only in text display mode
    if (displayMode === 'text') {
      nodes.filter(d => !d.entry.metadata.type || d.entry.metadata.type === 'text')
        .append('text')
        .attr('x', 0)
        .attr('y', d => d.entry.parentId ? 20 : 25) // Position below node
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-family', 'Arial, sans-serif')
        .style('fill', 'var(--foreground)')
        .style('pointer-events', 'none')
        .text(d => truncateText(d.entry.data))
    }

  }, [positionedEntries, dimensions.width, dimensions.height, collection, newlyAddedEntryId])

  return (
    <div className="relative w-full h-full">
      {/* Collection name only */}
      <div className="absolute top-4 left-4 z-10">
        <h1 className="text-2xl font-bold text-foreground">
          {collection}
        </h1>
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
        onClick={(event) => {
          // Only trigger onGraphClick if clicking on the SVG itself (empty space)
          if (event.target === event.currentTarget && onGraphClick) {
            onGraphClick()
          }
        }}
      />

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={fullscreenImage.url}
              alt={fullscreenImage.alt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition-opacity z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(UMAPVisualization)
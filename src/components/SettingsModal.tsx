'use client'

import React, { useState } from 'react'
import { X, Settings, Upload, Home } from 'lucide-react'
import AudioRecorder from '@/components/AudioRecorder'
import { useUploadThing } from '@/lib/uploadthing-client'
import { parseAuthorInput } from '@/lib/authorUtils'
import Link from 'next/link'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  isAdmin: boolean
  onAdminLogin: (username: string, password: string) => Promise<boolean>
  onAdminLogout: () => void
  collection: string
  collections: string[]
  onCollectionChange: (collection: string) => void
  onCreateCollection: (name: string) => Promise<void>
  onAddEntry: (data: FormData | Record<string, unknown>, type: 'text' | 'image' | 'audio' | 'csv') => Promise<void>
  isAddingEntry: boolean
  entries?: any[]
}

export default function SettingsModal({
  isOpen,
  onClose,
  isAdmin,
  onAdminLogin,
  onAdminLogout,
  collection,
  collections,
  onCollectionChange,
  onCreateCollection,
  onAddEntry,
  isAddingEntry,
  entries = [],
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'admin' | 'collections' | 'upload' | 'display' | 'export'>('collections')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [activeUploadTab, setActiveUploadTab] = useState<'text' | 'image' | 'audio' | 'csv'>('text')
  const [newEntryText, setNewEntryText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isRecordingUpload, setIsRecordingUpload] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [graphDisplayMode, setGraphDisplayMode] = useState<'text' | 'tooltip'>(() => {
    // Check if we're on mobile/tablet for default
    if (typeof window !== 'undefined') {
      // First check localStorage for saved preference
      const saved = localStorage.getItem('graphDisplayMode')
      if (saved && (saved === 'text' || saved === 'tooltip')) {
        // Set environment variable for immediate effect
        (window as typeof window & { NEXT_PUBLIC_GRAPH_DISPLAY_MODE?: string }).NEXT_PUBLIC_GRAPH_DISPLAY_MODE = saved
        return saved as 'text' | 'tooltip'
      }

      // Otherwise default based on device
      const isMobile = window.innerWidth <= 768
      if (isMobile) {
        (window as typeof window & { NEXT_PUBLIC_GRAPH_DISPLAY_MODE?: string }).NEXT_PUBLIC_GRAPH_DISPLAY_MODE = 'tooltip'
        return 'tooltip'
      } else {
        (window as typeof window & { NEXT_PUBLIC_GRAPH_DISPLAY_MODE?: string }).NEXT_PUBLIC_GRAPH_DISPLAY_MODE = 'text'
        return 'text'
      }
    }
    return 'tooltip'
  })

  const { startUpload: startImageUpload } = useUploadThing('imageUploader', {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        setUploadedImageUrl(res[0].url)
        setIsUploading(false)
      }
    },
    onUploadError: (error) => {
      console.error('Image upload error:', error)
      setIsUploading(false)
    },
  })

  const { startUpload: startAudioUpload } = useUploadThing('audioUploader', {
    onClientUploadComplete: async (res) => {
      if (res && res[0]) {
        setUploadedAudioUrl(res[0].url)
        setIsUploading(false)
      }
    },
    onUploadError: (error) => {
      console.error('Audio upload error:', error)
      setIsUploading(false)
      setIsRecordingUpload(false)
    },
  })

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return

    setIsLoggingIn(true)
    try {
      const success = await onAdminLogin(username, password)
      if (success) {
        setShowAdminLogin(false)
        setUsername('')
        setPassword('')
        // Stay on current tab after login
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || isCreatingCollection) return

    setIsCreatingCollection(true)
    try {
      await onCreateCollection(newCollectionName.trim())
      setNewCollectionName('')
      setShowNewCollectionForm(false)
      onClose() // Auto close modal after creating collection
    } catch (error) {
      console.error('Error creating collection:', error)
    } finally {
      setIsCreatingCollection(false)
    }
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newEntryText.trim() && !selectedFile && !uploadedImageUrl && !uploadedAudioUrl && !csvFile) || isAddingEntry) return

    try {
      if (activeUploadTab === 'text') {
        const authorData = parseAuthorInput(authorName)
        await onAddEntry({
          data: newEntryText,
          metadata: {
            type: 'text',
            author: Object.keys(authorData).length > 0 ? authorData : undefined,
          },
          collection,
        }, 'text')
      } else if (activeUploadTab === 'image') {
        if (uploadedImageUrl) {
          // Use UploadThing URL
          const formData = new FormData()
          formData.append('uploadthingUrl', uploadedImageUrl)
          formData.append('collection', collection)
          const authorData = parseAuthorInput(authorName)
          if (Object.keys(authorData).length > 0) {
            formData.append('metadata', JSON.stringify({
              author: authorData
            }))
          }
          await onAddEntry(formData, 'image')
        } else if (selectedFile) {
          // Fallback to direct upload
          const formData = new FormData()
          formData.append('image', selectedFile)
          formData.append('collection', collection)
          const authorData = parseAuthorInput(authorName)
          if (Object.keys(authorData).length > 0) {
            formData.append('metadata', JSON.stringify({
              author: authorData
            }))
          }
          await onAddEntry(formData, 'image')
        }
      } else if (activeUploadTab === 'audio') {
        if (uploadedAudioUrl) {
          // Use UploadThing URL
          const formData = new FormData()
          formData.append('uploadthingUrl', uploadedAudioUrl)
          formData.append('collection', collection)
          const authorData = parseAuthorInput(authorName)
          if (Object.keys(authorData).length > 0) {
            formData.append('metadata', JSON.stringify({
              author: authorData
            }))
          }
          await onAddEntry(formData, 'audio')
        } else if (selectedFile) {
          // Fallback to direct upload
          const formData = new FormData()
          formData.append('audio', selectedFile)
          formData.append('collection', collection)
          const authorData = parseAuthorInput(authorName)
          if (Object.keys(authorData).length > 0) {
            formData.append('metadata', JSON.stringify({
              author: authorData
            }))
          }
          await onAddEntry(formData, 'audio')
        }
      } else if (activeUploadTab === 'csv') {
        await onAddEntry({
          csvData,
          collection,
        }, 'csv')
      }

      setNewEntryText('')
      setAuthorName('')
      setSelectedFile(null)
      setCsvData('')
      setCsvFile(null)
      setUploadedImageUrl('')
      setUploadedAudioUrl('')
      onClose() // Auto close modal after adding entry
    } catch (error) {
      console.error('Error adding entry:', error)
    }
  }

  const handleRecordingComplete = async (audioBlob: Blob, filename: string) => {
    const audioFile = new File([audioBlob], filename, { type: audioBlob.type })
    setSelectedFile(audioFile)

    setIsUploading(true)
    setIsRecordingUpload(true)

    try {
      // Process audio and upload in parallel
      const [uploadResult, audioProcessResult] = await Promise.all([
        // Upload to UploadThing
        startAudioUpload([audioFile]),
        // Process with OpenAI
        (async () => {
          const formData = new FormData()
          formData.append('audio', audioFile)
          const response = await fetch('/api/process_audio', {
            method: 'POST',
            body: formData,
          })
          if (!response.ok) {
            throw new Error('Failed to process audio')
          }
          return response.json()
        })()
      ])

      // Wait for both to complete, then create the entry
      if (uploadResult && audioProcessResult) {
        // Get the upload URL from the result
        const uploadUrl = Array.isArray(uploadResult) && uploadResult[0]?.url ? uploadResult[0].url : uploadedAudioUrl

        if (!uploadUrl) {
          throw new Error('Upload URL not available')
        }

        // Create entry with processed data
        const authorData = parseAuthorInput(authorName)
        const response = await fetch('/api/add_processed_audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcription: audioProcessResult.transcription,
            embedding: audioProcessResult.embedding,
            uploadthingUrl: uploadUrl,
            collection,
            metadata: Object.keys(authorData).length > 0 ? { author: authorData } : {}
          }),
        })

        if (response.ok) {
          const result = await response.json()

          // Trigger a refresh of the entries list
          if (result && result.id) {
            // This would typically trigger the parent to refresh entries
            // For now, we'll rely on the onClose callback to handle it
          }

          // Reset states after successful entry creation
          setSelectedFile(null)
          setAuthorName('')
          setIsRecordingUpload(false)
          setUploadedAudioUrl('')
          setIsUploading(false)
          onClose() // Close modal after successful recording and transcription
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create audio entry')
        }
      }
    } catch (error) {
      console.error('Failed to process audio recording:', error)
      setIsUploading(false)
      setIsRecordingUpload(false)
    }
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsUploading(true)

    try {
      await startImageUpload([file])
    } catch (error) {
      console.error('Failed to start image upload:', error)
      setIsUploading(false)
    }
  }

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsUploading(true)

    try {
      await startAudioUpload([file])
    } catch (error) {
      console.error('Failed to start audio upload:', error)
      setIsUploading(false)
    }
  }

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file')
      return
    }

    setCsvFile(file)

    // Read and validate CSV file
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        // Basic CSV validation - check for data and author columns
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          alert('CSV file must have at least a header row and one data row')
          return
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
        if (!headers.includes('data') || !headers.includes('author')) {
          alert('CSV file must have "data" and "author" columns')
          return
        }

        setCsvData(text)
      }
    }
    reader.readAsText(file)
  }

  const handleExportHTML = async () => {
    if (!entries.length) {
      alert('No entries to export')
      return
    }

    setIsExporting(true)

    try {
      // Get the current UMAP positions from the actual visualization
      let positionedEntries: any[] = []

      try {
        // Try to get positions from the current page's UMAP visualization
        if (typeof window !== 'undefined' && (window as any).getCurrentUMAPPositions) {
          positionedEntries = (window as any).getCurrentUMAPPositions()
          console.log('Successfully captured', positionedEntries.length, 'live UMAP positions')
        }
      } catch (error) {
        console.log('Could not get live UMAP positions, using fallback')
      }

      // Only use fallback if we couldn't get live positions
      if (!positionedEntries || positionedEntries.length === 0) {
        console.log('Using fallback positioning since live positions not available')
        // Flatten entries to include comments as separate nodes
        const allEntries: any[] = []
        entries.forEach(entry => {
          allEntries.push(entry)
          if (entry.comments && entry.comments.length > 0) {
            entry.comments.forEach((comment: any) => {
              allEntries.push(comment)
            })
          }
        })

        // Use simple circular layout as fallback
        positionedEntries = allEntries.map((entry, index) => {
          if (allEntries.length === 1) {
            return { entry, position: [0, 0] as [number, number] }
          } else if (allEntries.length === 2) {
            return { entry, position: index === 0 ? [-1, 0] : [1, 0] as [number, number] }
          } else {
            const angle = (index / allEntries.length) * 2 * Math.PI
            const radius = 2
            return {
              entry,
              position: [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number]
            }
          }
        })
      } else {
        console.log('Using live UMAP positions for export')
      }

      // Generate QR code for source URL
      const sourceUrl = window.location.origin + window.location.pathname
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(sourceUrl)}`

      // Create a self-contained HTML file with embedded styles and scripts
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${collection} - Exported Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://unpkg.com/umap-js@1.5.3/lib/umap-js.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #ffffff;
            color: #111827;
            overflow: hidden;
        }

        .main-container {
            display: flex;
            height: 100vh;
        }

        .graph-container {
            flex: 1;
            position: relative;
        }

        .sidebar {
            width: 400px;
            background: #f9fafb;
            border-left: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            max-height: 100vh;
            overflow: hidden;
        }

        .tab-container {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
        }

        .tab {
            flex: 1;
            padding: 12px 16px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #6b7280;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .tab.active {
            color: #2563eb;
            border-bottom-color: #2563eb;
        }

        .tab-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }

        .ledger-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .ledger-table th,
        .ledger-table td {
            padding: 8px;
            border: 1px solid #e5e7eb;
            text-align: left;
        }

        .ledger-table th {
            background: #f3f4f6;
            font-weight: 600;
        }

        .ledger-table tr:hover {
            background: #f9fafb;
        }

        .entry-details {
            padding: 16px;
        }

        .entry-details h3 {
            margin-bottom: 8px;
            color: #111827;
        }

        .entry-details p {
            margin-bottom: 12px;
            line-height: 1.5;
        }

        .entry-type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
        }

        .type-text { background: #dbeafe; color: #1e40af; }
        .type-audio { background: #dcfce7; color: #166534; }
        .type-image { background: #fef3c7; color: #92400e; }

        .qr-code {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            background: white;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            max-width: 200px;
            pointer-events: none;
            z-index: 1000;
        }

        .collection-title {
            position: absolute;
            top: 20px;
            left: 20px;
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            z-index: 10;
        }

        .zoom-hint {
            position: absolute;
            bottom: 10px;
            left: 10px;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="main-container">
        <div class="graph-container">
            <div class="collection-title">${collection}</div>
            <svg id="visualization" style="width: 100%; height: 100%;"></svg>
            <div class="zoom-hint">Drag to pan • Scroll to zoom</div>
        </div>

        <div class="sidebar">
            <div class="tab-container">
                <button class="tab active" onclick="showTab('ledger')">Ledger</button>
                <button class="tab" onclick="showTab('entry')">Entry Details</button>
            </div>

            <div id="ledger-tab" class="tab-content">
                <h3 style="margin-bottom: 16px; color: #111827;">Collection Ledger</h3>
                <p style="margin-bottom: 16px; color: #6b7280; font-size: 14px;">${entries.length} entries total</p>
                <div style="overflow-x: auto;">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Author</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entries.map(entry => `
                                <tr onclick="selectEntry('${entry.id}')">
                                    <td>
                                        <span class="entry-type-badge type-${entry.metadata?.type || 'text'}">
                                            ${entry.metadata?.type || 'text'}
                                        </span>
                                    </td>
                                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${entry.data.substring(0, 100)}${entry.data.length > 100 ? '...' : ''}
                                    </td>
                                    <td>${entry.metadata?.author?.name || 'Anonymous'}</td>
                                    <td style="font-size: 10px;">${new Date(entry.createdAt).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="entry-tab" class="tab-content" style="display: none;">
                <div id="entry-details">
                    <p style="color: #6b7280;">Select an entry from the graph or ledger to view details</p>
                </div>
            </div>
        </div>
    </div>

    <div class="qr-code">
        <img src="${qrCodeUrl}" alt="QR Code to source" style="display: block;" />
        <p style="font-size: 10px; text-align: center; margin-top: 4px; color: #6b7280;">Source</p>
    </div>

    <script>
        // Entry data
        const entries = ${JSON.stringify(entries)};
        const positionedEntries = ${JSON.stringify(positionedEntries)};
        let selectedEntryId = null;

        // Tab switching
        function showTab(tabName) {
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelector('button[onclick="showTab(\\''+tabName+'\\')"]').classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
            document.getElementById(tabName + '-tab').style.display = 'block';
        }

        function selectEntry(entryId) {
            selectedEntryId = entryId;
            const entry = entries.find(e => e.id === entryId);
            if (!entry) return;

            // Update entry details
            const detailsContainer = document.getElementById('entry-details');
            const entryType = entry.metadata?.type || 'text';

            let content = '';

            // Handle different entry types with proper rendering
            if (entryType === 'image' && (entry.metadata?.imageUrl || entry.metadata?.imageFile)) {
                const imageUrl = entry.metadata.imageUrl || ('/images/' + entry.metadata.imageFile);
                content = '<div style="margin-bottom: 12px;"><img src="' + imageUrl + '" alt="Image" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #e5e7eb; cursor: pointer;" onclick="window.open(\\'' + imageUrl + '\\', \\'_blank\\')"></div><p style="font-style: italic; color: #6b7280;">' + entry.data.replace(/'/g, "\\'") + '</p>';
            } else if (entryType === 'youtube' && entry.metadata?.url) {
                content = '<div style="margin-bottom: 12px;"><a href="' + entry.metadata.url + '" target="_blank" style="color: #2563eb; text-decoration: underline;">🎥 Watch on YouTube</a></div><p>' + entry.data.replace(/'/g, "\\'") + '</p>';
            } else if (entryType === 'spotify' && entry.metadata?.url) {
                content = '<div style="margin-bottom: 12px;"><a href="' + entry.metadata.url + '" target="_blank" style="color: #1ed760; text-decoration: underline;">🎵 Listen on Spotify</a></div><p>' + entry.data.replace(/'/g, "\\'") + '</p>';
            } else if (entryType === 'audio' && entry.metadata?.audioUrl) {
                content = '<div style="margin-bottom: 12px;"><audio controls style="width: 100%;"><source src="' + entry.metadata.audioUrl + '" type="audio/mpeg"><source src="' + entry.metadata.audioUrl + '" type="audio/wav">Your browser does not support the audio element.</audio></div><p style="font-style: italic; color: #6b7280;">Transcription: ' + entry.data.replace(/'/g, "\\'") + '</p>';
            } else {
                content = '<p>' + entry.data.replace(/'/g, "\\'") + '</p>';
            }

            let innerHTML = '<div><span class="entry-type-badge type-' + entryType + '">' + entryType + '</span></div>';
            innerHTML += '<h3 style="margin: 12px 0;">Content</h3>';
            innerHTML += content;
            innerHTML += '<h3 style="margin: 12px 0 4px 0;">Author</h3>';
            innerHTML += '<p>' + (entry.metadata?.author?.name || 'Anonymous') + '</p>';
            innerHTML += '<h3 style="margin: 12px 0 4px 0;">Created</h3>';
            innerHTML += '<p>' + new Date(entry.createdAt).toLocaleString() + '</p>';

            if (entry.comments && entry.comments.length > 0) {
                innerHTML += '<h3 style="margin: 12px 0 4px 0;">Comments (' + entry.comments.length + ')</h3>';
                entry.comments.forEach(comment => {
                    innerHTML += '<div style="margin: 8px 0; padding: 8px; background: #f3f4f6; border-radius: 4px;">';
                    innerHTML += '<p style="margin: 0;">' + comment.data.replace(/'/g, "\\'") + '</p>';
                    innerHTML += '<p style="margin: 4px 0 0 0; font-size: 10px; color: #6b7280;">' + new Date(comment.createdAt).toLocaleString() + '</p>';
                    innerHTML += '</div>';
                });
            }

            detailsContainer.innerHTML = innerHTML;

            // Switch to entry details tab
            showTab('entry');

            // Highlight node in graph
            highlightNode(entryId);
        }

        function highlightNode(entryId) {
            // Remove previous highlights
            d3.selectAll('.node circle, .node rect').attr('stroke-width', 2).attr('stroke', '#fff');

            // Highlight selected node
            d3.selectAll('.node').each(function(d) {
                if (d && d.entry && d.entry.id === entryId) {
                    d3.select(this).select('circle, rect').attr('stroke-width', 4).attr('stroke', '#ff6b35');
                }
            });
        }

        // Visualization with pre-calculated positions (snapshot)
        function createVisualization() {
            const svg = d3.select('#visualization');
            const width = window.innerWidth * 0.6; // Approximate width
            const height = window.innerHeight;

            console.log('Creating visualization with', positionedEntries.length, 'positioned entries');

            svg.selectAll('*').remove();

            if (positionedEntries.length === 0) {
                console.log('No positioned entries, showing empty message');
                svg.append('text')
                    .attr('x', width / 2)
                    .attr('y', height / 2)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'gray')
                    .attr('font-size', '18px')
                    .text('No entries found');
                return;
            }

            // Use the pre-calculated positioned entries (no UMAP calculation needed)
            const flattenedEntries = positionedEntries.map(pe => pe.entry);
            const positions = positionedEntries.map(pe => pe.position);

            console.log('Flattened entries:', flattenedEntries.length);
            console.log('Positions:', positions.slice(0, 3)); // Log first 3 positions for debug

            // Add arrowhead marker definition
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
                .attr('fill', '#94a3b8');

            // Handle single entry case
            if (flattenedEntries.length === 1) {
                const g = svg.append('g');
                const entry = flattenedEntries[0];
                const centerX = width / 2;
                const centerY = height / 2;

                const node = g.append('g')
                    .attr('class', 'node')
                    .attr('transform', 'translate(' + centerX + ', ' + centerY + ')')
                    .style('cursor', 'pointer')
                    .datum({entry})
                    .on('click', (event, d) => selectEntry(d.entry.id));

                if (entry.metadata?.type === 'image') {
                    node.append('circle').attr('r', 12).attr('fill', '#f59e0b').attr('stroke', '#fff').attr('stroke-width', 2);
                    node.append('rect').attr('x', -5).attr('y', -5).attr('width', 10).attr('height', 8).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 1.5).attr('rx', 1);
                    node.append('circle').attr('cx', 2).attr('cy', -2).attr('r', 1.5).attr('fill', '#fff');
                } else if (entry.metadata?.type === 'audio') {
                    node.append('circle').attr('r', 12).attr('fill', '#10b981').attr('stroke', '#fff').attr('stroke-width', 2);
                    node.append('polygon').attr('points', '-4,-6 -4,6 6,0').attr('fill', '#fff');
                } else if (entry.metadata?.type === 'youtube') {
                    node.append('rect').attr('x', -12).attr('y', -8).attr('width', 24).attr('height', 16).attr('fill', '#ff0000').attr('stroke', '#fff').attr('stroke-width', 2).attr('rx', 2);
                    node.append('polygon').attr('points', '-4,-3 -4,3 3,0').attr('fill', '#fff');
                } else if (entry.metadata?.type === 'spotify') {
                    node.append('circle').attr('r', 12).attr('fill', '#1ed760').attr('stroke', '#fff').attr('stroke-width', 2);
                    node.append('path').attr('d', 'M-3,-4 C-3,-5 -2,-6 0,-6 C2,-6 3,-5 3,-4 C3,-1 2,1 0,1 C-2,1 -3,-1 -3,-4 M0,1 L0,5 M-2,4 L2,4').attr('fill', '#fff').attr('stroke', '#fff').attr('stroke-width', 0.5);
                } else {
                    node.append('circle').attr('r', 8).attr('fill', '#3b82f6').attr('stroke', '#fff').attr('stroke-width', 2);
                }

                // Add text labels
                node.append('text')
                    .attr('x', 0)
                    .attr('y', entry.metadata?.type === 'image' || entry.metadata?.type === 'youtube' ? 25 : 20)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', '#333')
                    .style('pointer-events', 'none')
                    .text(entry.data.substring(0, 20) + (entry.data.length > 20 ? '...' : ''));

                return;
            }

            // Create scales using the pre-calculated positions
            const xExtent = d3.extent(positions, d => d[0]);
            const yExtent = d3.extent(positions, d => d[1]);

            const xScale = d3.scaleLinear()
                .domain(xExtent)
                .range([100, width - 100]);

            const yScale = d3.scaleLinear()
                .domain(yExtent)
                .range([100, height - 100]);

            const g = svg.append('g');

            const zoom = d3.zoom()
                .scaleExtent([0.1, 10])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });

            svg.call(zoom);

            // Draw lines connecting comments to their parent entries
            flattenedEntries.forEach((entry, entryIndex) => {
                if (entry.parentId) {
                    const parentIndex = flattenedEntries.findIndex(e => e.id === entry.parentId);
                    if (parentIndex >= 0 && positions[parentIndex] && positions[entryIndex]) {
                        const [parentX, parentY] = positions[parentIndex];
                        const [commentX, commentY] = positions[entryIndex];

                        g.append('line')
                            .attr('x1', xScale(parentX))
                            .attr('y1', yScale(parentY))
                            .attr('x2', xScale(commentX))
                            .attr('y2', yScale(commentY))
                            .attr('stroke', '#94a3b8')
                            .attr('stroke-width', 1)
                            .attr('stroke-dasharray', '3,3')
                            .attr('marker-end', 'url(#arrowhead)');
                    }
                }
            });

            // Draw nodes
            const nodes = g.selectAll('.node')
                .data(flattenedEntries.map((entry, i) => ({ entry, position: positions[i] })).filter(d => d.position))
                .enter()
                .append('g')
                .attr('class', 'node')
                .attr('transform', d => 'translate(' + xScale(d.position[0]) + ', ' + yScale(d.position[1]) + ')')
                .style('cursor', 'pointer')
                .on('click', (event, d) => selectEntry(d.entry.id))
                .on('mouseenter', function(event, d) {
                    d3.select(this).select('circle, rect').attr('stroke-width', 4);
                    // Show tooltip
                    const tooltip = d3.select('body').append('div')
                        .attr('class', 'tooltip')
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY + 10) + 'px')
                        .text(d.entry.data.substring(0, 100) + (d.entry.data.length > 100 ? '...' : ''));
                })
                .on('mouseleave', function() {
                    d3.select(this).select('circle, rect').attr('stroke-width', 2);
                    d3.selectAll('.tooltip').remove();
                });

            // Draw different node types
            nodes.filter(d => !d.entry.metadata.type || d.entry.metadata.type === 'text')
                .append('circle')
                .attr('r', d => d.entry.parentId ? 6 : 8) // Smaller for comments
                .attr('fill', '#3b82f6')
                .attr('fill-opacity', d => d.entry.parentId ? 0.7 : 1) // More transparent for comments
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);

            nodes.filter(d => d.entry.metadata.type === 'image')
                .each(function(d) {
                    const node = d3.select(this);
                    node.append('circle').attr('r', d.entry.parentId ? 10 : 12).attr('fill', '#f59e0b').attr('fill-opacity', d.entry.parentId ? 0.7 : 1).attr('stroke', '#fff').attr('stroke-width', 2);
                    node.append('rect').attr('x', -5).attr('y', -5).attr('width', 10).attr('height', 8).attr('fill', 'none').attr('stroke', '#fff').attr('stroke-width', 1.5).attr('rx', 1);
                    node.append('circle').attr('cx', 2).attr('cy', -2).attr('r', 1.5).attr('fill', '#fff');
                });

            nodes.filter(d => d.entry.metadata.type === 'audio')
                .each(function(d) {
                    const node = d3.select(this);
                    node.append('circle').attr('r', d.entry.parentId ? 10 : 12).attr('fill', '#10b981').attr('fill-opacity', d.entry.parentId ? 0.7 : 1).attr('stroke', '#fff').attr('stroke-width', 2);
                    node.append('polygon').attr('points', d.entry.parentId ? '-3,-4 -3,4 4,0' : '-4,-6 -4,6 6,0').attr('fill', '#fff');
                });

            nodes.filter(d => d.entry.metadata.type === 'youtube')
                .each(function(d) {
                    const node = d3.select(this);
                    node.append('rect').attr('x', d.entry.parentId ? -10 : -12).attr('y', d.entry.parentId ? -6 : -8).attr('width', d.entry.parentId ? 20 : 24).attr('height', d.entry.parentId ? 12 : 16).attr('fill', '#ff0000').attr('fill-opacity', d.entry.parentId ? 0.7 : 1).attr('stroke', '#fff').attr('stroke-width', 2).attr('rx', 2);
                    node.append('polygon').attr('points', d.entry.parentId ? '-3,-2 -3,2 2,0' : '-4,-3 -4,3 3,0').attr('fill', '#fff');
                });

            nodes.filter(d => d.entry.metadata.type === 'spotify')
                .each(function(d) {
                    const node = d3.select(this);
                    node.append('circle').attr('r', d.entry.parentId ? 10 : 12).attr('fill', '#1ed760').attr('fill-opacity', d.entry.parentId ? 0.7 : 1).attr('stroke', '#fff').attr('stroke-width', 2);
                    node.append('path').attr('d', d.entry.parentId ? 'M-2,-3 C-2,-4 -1,-5 0,-5 C1,-5 2,-4 2,-3 C2,-1 1,0 0,0 C-1,0 -2,-1 -2,-3 M0,0 L0,4 M-1,3 L1,3' : 'M-3,-4 C-3,-5 -2,-6 0,-6 C2,-6 3,-5 3,-4 C3,-1 2,1 0,1 C-2,1 -3,-1 -3,-4 M0,1 L0,5 M-2,4 L2,4').attr('fill', '#fff').attr('stroke', '#fff').attr('stroke-width', 0.5);
                });

            // Add text labels
            nodes.append('text')
                .attr('x', 0)
                .attr('y', d => {
                    if (d.entry.metadata?.type === 'image' || d.entry.metadata?.type === 'youtube') {
                        return d.entry.parentId ? 22 : 25;
                    }
                    return d.entry.parentId ? 18 : 20;
                })
                .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', '#333')
                .style('pointer-events', 'none')
                .text(d => d.entry.data.substring(0, 20) + (d.entry.data.length > 20 ? '...' : ''));
        }

        // Initialize visualization
        window.addEventListener('load', () => {
            createVisualization();
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            createVisualization();
        });
    </script>
</body>
</html>`;

      // Create and download the file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collection}-export.html`;
      a.click();
      URL.revokeObjectURL(url);

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export HTML. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings size={20} />
            Settings
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 text-muted-foreground hover:bg-accent hover:text-card-foreground rounded transition-colors"
              title="Go to Homepage"
            >
              <Home size={20} />
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:bg-accent rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'collections'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-muted-foreground hover:text-card-foreground'
            }`}
          >
            Collections
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'display'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-muted-foreground hover:text-card-foreground'
            }`}
          >
            Display
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'admin'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-muted-foreground hover:text-card-foreground'
            }`}
          >
            Admin
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                Add Entry
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'export'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-muted-foreground hover:text-card-foreground'
                }`}
              >
                Export HTML
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Current Collection</label>
                <select
                  value={collection}
                  onChange={(e) => {
                    onCollectionChange(e.target.value)
                    onClose() // Auto close modal after switching collection
                  }}
                  className="w-full p-2 bg-input border border-border text-input-foreground rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {collections.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* New Collection - Admin Only */}
              {isAdmin && (
                <div className="border-t border-border pt-4">
                  {!showNewCollectionForm ? (
                    <button
                      onClick={() => setShowNewCollectionForm(true)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      + New Collection
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Collection name"
                        className="w-full p-2 bg-input border border-border text-input-foreground rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateCollection()
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateCollection}
                          disabled={!newCollectionName.trim() || isCreatingCollection}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                        >
                          {isCreatingCollection ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          onClick={() => {
                            setShowNewCollectionForm(false)
                            setNewCollectionName('')
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-card-foreground mb-4">Graph Display Options</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Node Display Mode
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="displayMode"
                          value="text"
                          checked={graphDisplayMode === 'text'}
                          onChange={(e) => {
                            const newMode = e.target.value as 'text' | 'tooltip'
                            setGraphDisplayMode(newMode)
                            // Store in localStorage for persistence
                            localStorage.setItem('graphDisplayMode', e.target.value)
                            // Set environment variable for immediate effect
                            if (typeof window !== 'undefined') {
                              (window as typeof window & { NEXT_PUBLIC_GRAPH_DISPLAY_MODE?: string }).NEXT_PUBLIC_GRAPH_DISPLAY_MODE = e.target.value
                            }
                            // Force page refresh for immediate effect
                            setTimeout(() => window.location.reload(), 100)
                          }}
                          className="form-radio text-blue-600"
                        />
                        <span className="text-sm text-card-foreground">
                          <strong>Text Mode:</strong> Show text labels next to nodes (recommended for desktop)
                        </span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="displayMode"
                          value="tooltip"
                          checked={graphDisplayMode === 'tooltip'}
                          onChange={(e) => {
                            const newMode = e.target.value as 'text' | 'tooltip'
                            setGraphDisplayMode(newMode)
                            // Store in localStorage for persistence
                            localStorage.setItem('graphDisplayMode', e.target.value)
                            // Set environment variable for immediate effect
                            if (typeof window !== 'undefined') {
                              (window as typeof window & { NEXT_PUBLIC_GRAPH_DISPLAY_MODE?: string }).NEXT_PUBLIC_GRAPH_DISPLAY_MODE = e.target.value
                            }
                            // Force page refresh for immediate effect
                            setTimeout(() => window.location.reload(), 100)
                          }}
                          className="form-radio text-blue-600"
                        />
                        <span className="text-sm text-card-foreground">
                          <strong>Hover Mode:</strong> Show text on hover/tap (recommended for mobile)
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Changes take effect immediately after a brief page refresh.
                    </p>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium text-card-foreground mb-2">Current Device</h4>
                    <p className="text-xs text-muted-foreground">
                      {typeof window !== 'undefined' && window.innerWidth <= 768 ?
                        'Mobile/Tablet - Hover mode recommended' :
                        'Desktop - Text mode recommended'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              {!isAdmin ? (
                !showAdminLogin ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Admin access required for advanced features</p>
                    <button
                      onClick={() => setShowAdminLogin(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Sign In as Admin
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-1">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2 bg-input border border-border text-input-foreground rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-1">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 bg-input border border-border text-input-foreground rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {isLoggingIn ? 'Signing In...' : 'Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAdminLogin(false)}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-medium">Admin Mode Active</p>
                    <p className="text-green-600 text-sm">You have access to all administrative features</p>
                  </div>
                  <button
                    onClick={onAdminLogout}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}


          {/* Export HTML Tab */}
          {activeTab === 'export' && isAdmin && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-card-foreground mb-4">Export Collection as HTML</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Export the current graph visualization, ledger table, and entry sidebar to a self-contained HTML file that can be downloaded and shared.
                </p>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What's included:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Interactive graph visualization with current node positions</li>
                    <li>• Ledger table with all entries</li>
                    <li>• Entry details sidebar</li>
                    <li>• QR code linking back to source URL</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <p className="font-medium text-card-foreground">Collection: {collection}</p>
                      <p className="text-sm text-muted-foreground">{entries.length} entries to export</p>
                    </div>
                  </div>

                  <button
                    onClick={handleExportHTML}
                    disabled={isExporting || entries.length === 0}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isExporting ? 'Generating HTML...' : `Export ${collection} as HTML`}
                  </button>

                  {entries.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                      No entries to export. Add some entries first.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && isAdmin && (
            <div className="space-y-4">
              {/* Upload Type Tabs */}
              <div className="flex mb-4 border-b">
                {(['text', 'image', 'audio', 'csv'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveUploadTab(tab)}
                    className={`px-3 py-2 text-sm font-medium capitalize ${
                      activeUploadTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-muted-foreground hover:text-card-foreground'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddEntry} className="space-y-4">
                {/* Text Upload */}
                {activeUploadTab === 'text' && (
                  <div>
                    <textarea
                      value={newEntryText}
                      onChange={(e) => setNewEntryText(e.target.value)}
                      placeholder="Enter your text here..."
                      className="w-full p-3 bg-input border border-border text-input-foreground rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>
                )}

                {/* Image Upload */}
                {activeUploadTab === 'image' && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="w-full p-3 bg-input border border-border text-input-foreground rounded"
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <div className="flex items-center mt-2 text-blue-600">
                        <Upload className="animate-spin mr-2" size={16} />
                        <p className="text-sm">Uploading to UploadThing...</p>
                      </div>
                    )}
                    {uploadedImageUrl && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800">✓ Image uploaded successfully to UploadThing</p>
                        <img src={uploadedImageUrl} alt="Uploaded" className="mt-1 max-w-32 h-auto rounded" />
                      </div>
                    )}
                    {selectedFile && !uploadedImageUrl && !isUploading && (
                      <p className="text-sm text-muted-foreground mt-2">Selected: {selectedFile.name}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">Images are hosted on UploadThing and will be automatically captioned using AI</p>
                  </div>
                )}

                {/* Audio Upload */}
                {activeUploadTab === 'audio' && (
                  <div className="space-y-3">
                    <div>
                      <input
                        type="file"
                        accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.flac"
                        onChange={handleAudioFileChange}
                        className="w-full p-3 bg-input border border-border text-input-foreground rounded"
                        disabled={isUploading}
                      />
                      {isUploading && (
                        <div className="flex items-center mt-2 text-blue-600">
                          <Upload className="animate-spin mr-2" size={16} />
                          <p className="text-sm">Uploading to UploadThing...</p>
                        </div>
                      )}
                      {uploadedAudioUrl && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800">✓ Audio uploaded successfully to UploadThing</p>
                          <audio controls className="mt-1 w-full max-w-xs">
                            <source src={uploadedAudioUrl} />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      {selectedFile && !uploadedAudioUrl && !isUploading && (
                        <p className="text-sm text-muted-foreground mt-2">Selected: {selectedFile.name}</p>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">OR</span>
                      </div>
                    </div>

                    <AudioRecorder
                      onRecordingComplete={handleRecordingComplete}
                      disabled={isAddingEntry}
                    />

                    <p className="text-sm text-muted-foreground">Audio files are hosted on UploadThing and will be automatically transcribed using AI</p>
                  </div>
                )}

                {/* CSV Upload */}
                {activeUploadTab === 'csv' && (
                  <div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="w-full p-3 bg-input border border-border text-input-foreground rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {csvFile && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-700">
                          ✅ {csvFile.name} selected and validated
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          File contains required &quot;data&quot; and &quot;author&quot; columns
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload a CSV file with &quot;data&quot; and &quot;author&quot; columns for batch entry creation
                    </p>
                  </div>
                )}

                {/* Author Field (not for CSV) */}
                {activeUploadTab !== 'csv' && (
                  <div>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your name or @instagram (optional)"
                      className="w-full p-3 bg-input border border-border text-input-foreground rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    (activeUploadTab === 'text' && !newEntryText.trim()) ||
                    (activeUploadTab === 'image' && !uploadedImageUrl && !selectedFile) ||
                    (activeUploadTab === 'audio' && !uploadedAudioUrl && !selectedFile) ||
                    (activeUploadTab === 'csv' && !csvFile) ||
                    isAddingEntry ||
                    isUploading
                  }
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isUploading ? 'Uploading...' : isAddingEntry ? 'Processing...' : `Add ${activeUploadTab === 'csv' ? 'Batch' : activeUploadTab.charAt(0).toUpperCase() + activeUploadTab.slice(1)}`}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
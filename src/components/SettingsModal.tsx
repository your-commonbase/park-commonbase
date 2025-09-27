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
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'admin' | 'collections' | 'upload' | 'display'>('collections')
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
      const mode: 'text' | 'tooltip' = isMobile ? 'tooltip' : 'text'
      // Set environment variable for immediate effect
      (window as typeof window & { NEXT_PUBLIC_GRAPH_DISPLAY_MODE?: string }).NEXT_PUBLIC_GRAPH_DISPLAY_MODE = mode
      return mode
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
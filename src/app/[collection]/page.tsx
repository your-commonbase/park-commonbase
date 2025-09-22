'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import UMAPVisualization from '@/components/UMAPVisualization'
import Sidebar from '@/components/Sidebar'
import AdminLogin from '@/components/AdminLogin'
import AudioRecorder from '@/components/AudioRecorder'

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

export default function CollectionPage() {
  const params = useParams()
  const router = useRouter()
  const collectionParam = params?.collection as string

  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [collection, setCollection] = useState(collectionParam || 'default')
  const [collections, setCollections] = useState<string[]>(['default'])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [apiKey] = useState(process.env.NEXT_PUBLIC_API_KEY || '')
  const [newEntryText, setNewEntryText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [activeUploadTab, setActiveUploadTab] = useState<'text' | 'image' | 'audio' | 'csv'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState('')
  const [showNewCollectionForm, setShowNewCollectionForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [newlyAddedEntryId, setNewlyAddedEntryId] = useState<string | undefined>(undefined)

  // Check for admin cookie on page load
  useEffect(() => {
    const adminCookie = Cookies.get('park-admin')
    if (adminCookie === 'true') {
      setIsAdmin(true)
    }
  }, [])

  // Update collection when URL parameter changes
  useEffect(() => {
    if (collectionParam) {
      setCollection(collectionParam)
    }
  }, [collectionParam])

  // Load all available collections
  useEffect(() => {
    const serverApiKey = 'testkey'
    fetch('/api/collections', {
      headers: {
        'x-api-key': serverApiKey,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const collectionNames = data.map(col => col.name)
          setCollections(collectionNames)
        }
      })
      .catch(error => {
        console.error('Error loading collections:', error)
      })
  }, [])

  // Load data for current collection
  useEffect(() => {
    fetch(`/api/collection/${collection}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEntries(data)
        }
      })
      .catch(error => {
        console.error('Error loading entries:', error)
      })
  }, [collection])

  const handleNodeClick = (entry: Entry) => {
    // If sidebar is open, close it regardless of which entry is clicked
    if (selectedEntry) {
      setSelectedEntry(null)
    } else {
      // If sidebar is closed, open it with the clicked entry
      setSelectedEntry(entry)
    }
  }

  const handleCollectionChange = (newCollection: string) => {
    setSelectedEntry(null)
    router.push(`/${newCollection}`)
  }

  const handleAdminLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin_signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        setIsAdmin(true)
        setShowAdminLogin(false)
        Cookies.set('park-admin', 'true', { expires: 7 }) // Cookie expires in 7 days
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Admin login error:', error)
      return false
    }
  }

  const handleAddComment = async (parentId: string, content: string) => {
    const serverApiKey = 'testkey' // Match the server-side API key

    try {
      const response = await fetch('/api/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': serverApiKey,
        },
        body: JSON.stringify({
          data: content,
          metadata: { type: 'text' },
          collection,
          parentId,
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Track newly added comment for highlighting
        if (result && result.id) {
          setNewlyAddedEntryId(result.id)
          // Clear highlight after 3 seconds
          setTimeout(() => setNewlyAddedEntryId(undefined), 3000)
        }

        // Refresh entries
        const updatedEntries = await fetch(`/api/collection/${collection}`).then(res => res.json())

        setEntries(updatedEntries)

        // Update selected entry with new comments
        const updatedEntry = updatedEntries.find((e: Entry) => e.id === parentId)
        if (updatedEntry) {
          setSelectedEntry(updatedEntry)
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/delete_entry/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setEntries(entries.filter(entry => entry.id !== id))
        setSelectedEntry(null)
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  const handleDeleteComment = async (id: string) => {
    try {
      const response = await fetch(`/api/delete_comment/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh entries
        const updatedEntries = await fetch(`/api/collection/${collection}`).then(res => res.json())

        setEntries(updatedEntries)

        // Update selected entry
        if (selectedEntry) {
          const updatedEntry = updatedEntries.find((e: Entry) => e.id === selectedEntry.id)
          if (updatedEntry) {
            setSelectedEntry(updatedEntry)
          }
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newEntryText.trim() && !selectedFile && !csvData.trim()) || isAddingEntry) return

    setIsAddingEntry(true)
    const serverApiKey = 'testkey' // Match the server-side API key

    try {
      let response
      let result

      if (activeUploadTab === 'text') {
        console.log('Adding text entry:', newEntryText)
        response = await fetch('/api/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': serverApiKey,
          },
          body: JSON.stringify({
            data: newEntryText,
            collection,
            metadata: {
              type: 'text',
              author: authorName.trim() ? { name: authorName.trim() } : undefined,
            },
          }),
        })
        result = await response.json()
      } else if (activeUploadTab === 'image' && selectedFile) {
        console.log('Adding image entry:', selectedFile.name)
        const formData = new FormData()
        formData.append('image', selectedFile)
        formData.append('collection', collection)
        if (authorName.trim()) {
          formData.append('metadata', JSON.stringify({
            author: { name: authorName.trim() }
          }))
        }

        response = await fetch('/api/add_image', {
          method: 'POST',
          headers: {
            'x-api-key': serverApiKey,
          },
          body: formData,
        })
        result = await response.json()
      } else if (activeUploadTab === 'audio' && selectedFile) {
        console.log('Adding audio entry:', selectedFile.name)
        const formData = new FormData()
        formData.append('audio', selectedFile)
        formData.append('collection', collection)
        if (authorName.trim()) {
          formData.append('metadata', JSON.stringify({
            author: { name: authorName.trim() }
          }))
        }

        response = await fetch('/api/add_audio', {
          method: 'POST',
          headers: {
            'x-api-key': serverApiKey,
          },
          body: formData,
        })
        result = await response.json()
      } else if (activeUploadTab === 'csv') {
        console.log('Processing CSV data...')
        response = await handleCSVUpload()
        result = response
      }

      console.log('Add entry response:', result)

      if (response && response.ok) {
        console.log('Entry added successfully, refreshing data...')

        // Clear form
        setNewEntryText('')
        setAuthorName('')
        setSelectedFile(null)
        setCsvData('')

        // Track newly added entry for highlighting
        if (result && result.id) {
          setNewlyAddedEntryId(result.id)
          // Clear highlight after 3 seconds
          setTimeout(() => setNewlyAddedEntryId(undefined), 3000)
        }

        // Add a small delay to ensure processing is complete
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Refresh entries
        const updatedEntries = await fetch(`/api/collection/${collection}`).then(res => res.json())
        setEntries(updatedEntries)
      } else {
        console.error('Failed to add entry:', result)
      }
    } catch (error) {
      console.error('Error adding entry:', error)
    } finally {
      setIsAddingEntry(false)
    }
  }

  const handleCSVUpload = async () => {
    if (!csvData.trim()) return { ok: false }

    const serverApiKey = 'testkey'

    try {
      const response = await fetch('/api/batch_upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': serverApiKey,
        },
        body: JSON.stringify({
          csvData: csvData,
          collection,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log(`Batch upload completed: ${result.processed} entries processed, ${result.errors} errors`)
        if (result.errors > 0) {
          console.warn('Batch upload errors:', result.errors)
        }
      }

      return response
    } catch (error) {
      console.error('Error in CSV upload:', error)
      return { ok: false }
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || isCreatingCollection) return

    setIsCreatingCollection(true)
    const serverApiKey = 'testkey'

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': serverApiKey,
        },
        body: JSON.stringify({
          name: newCollectionName.trim(),
        }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log('Collection created successfully:', result)

        // Clear form
        setNewCollectionName('')
        setShowNewCollectionForm(false)

        // Refresh collections list
        fetch('/api/collections', {
          headers: {
            'x-api-key': serverApiKey,
          },
        })
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              const collectionNames = data.map(col => col.name)
              setCollections(collectionNames)
            }
          })
          .catch(error => {
            console.error('Error refreshing collections:', error)
          })

        // Navigate to the new collection
        router.push(`/${newCollectionName.trim()}`)
      } else {
        console.error('Failed to create collection:', result)
        alert(result.error || 'Failed to create collection')
      }
    } catch (error) {
      console.error('Error creating collection:', error)
      alert('Error creating collection')
    } finally {
      setIsCreatingCollection(false)
    }
  }

  const handleRecordingComplete = (audioBlob: Blob, filename: string) => {
    // Convert Blob to File
    const audioFile = new File([audioBlob], filename, { type: audioBlob.type })
    setSelectedFile(audioFile)
    console.log('Recording completed:', filename, audioFile.type, audioFile.size)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Admin Login Button */}
      {!isAdmin && (
        <button
          onClick={() => setShowAdminLogin(true)}
          className="absolute top-4 right-4 z-50 px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 transition-colors"
        >
          Admin
        </button>
      )}

      {/* Admin Status */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <div className="px-3 py-1 bg-green-600 text-white text-sm rounded">
            Admin Mode
          </div>
          <button
            onClick={() => {
              setIsAdmin(false)
              Cookies.remove('park-admin')
            }}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      )}

      {/* Admin Upload Panel */}
      {isAdmin && (
        <div className="absolute top-16 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96">
          <h3 className="text-sm font-medium mb-4 text-gray-800">Add Entry</h3>

          {/* Tabs */}
          <div className="flex mb-4 border-b">
            {(['text', 'image', 'audio', 'csv'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveUploadTab(tab)}
                className={`px-3 py-1 text-xs font-medium capitalize ${
                  activeUploadTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddEntry}>
            {/* Text Upload */}
            {activeUploadTab === 'text' && (
              <div className="space-y-3">
                <textarea
                  value={newEntryText}
                  onChange={(e) => setNewEntryText(e.target.value)}
                  placeholder="Enter your text here..."
                  className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
                  rows={3}
                />
              </div>
            )}

            {/* Image Upload */}
            {activeUploadTab === 'image' && (
              <div className="space-y-3">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900"
                  />
                  {selectedFile && (
                    <p className="text-xs text-gray-600 mt-1">Selected: {selectedFile.name}</p>
                  )}
                </div>
                <p className="text-xs text-gray-600">Image will be automatically captioned using AI</p>
              </div>
            )}

            {/* Audio Upload */}
            {activeUploadTab === 'audio' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Choose File</label>
                  <input
                    type="file"
                    accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.flac"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white text-gray-900"
                  />
                  {selectedFile && (
                    <p className="text-xs text-gray-600 mt-1">Selected: {selectedFile.name}</p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-500">OR</span>
                  </div>
                </div>

                <AudioRecorder
                  onRecordingComplete={handleRecordingComplete}
                  disabled={isAddingEntry}
                />

                <p className="text-xs text-gray-600">Audio (including iPhone/iPad voice memos) will be automatically transcribed using AI</p>
              </div>
            )}

            {/* CSV Upload */}
            {activeUploadTab === 'csv' && (
              <div className="space-y-3">
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Paste CSV data here (data,author columns)..."
                  className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900 placeholder-gray-500"
                  rows={4}
                />
                <p className="text-xs text-gray-600">Format: Each row should have 'data' and 'author' columns</p>
              </div>
            )}

            {/* Common Author Field */}
            {activeUploadTab !== 'csv' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Author name (optional)"
                  className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                (activeUploadTab === 'text' && !newEntryText.trim()) ||
                ((activeUploadTab === 'image' || activeUploadTab === 'audio') && !selectedFile) ||
                (activeUploadTab === 'csv' && !csvData.trim()) ||
                isAddingEntry
              }
              className="w-full mt-4 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingEntry ? 'Processing...' : `Add ${activeUploadTab === 'csv' ? 'Batch' : activeUploadTab.charAt(0).toUpperCase() + activeUploadTab.slice(1)}`}
            </button>
          </form>
        </div>
      )}

      {/* Collection Management Panel */}
      {isAdmin && (
        <div className="absolute top-16 left-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
          <h3 className="text-sm font-medium mb-4 text-gray-800">Collections</h3>

          {!showNewCollectionForm ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">Current: {collection}</p>
              <button
                onClick={() => setShowNewCollectionForm(true)}
                className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                + New Collection
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900 placeholder-gray-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCollection()
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || isCreatingCollection}
                  className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreatingCollection ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowNewCollectionForm(false)
                    setNewCollectionName('')
                  }}
                  className="px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-600">Press Enter to create or click Create</p>
            </div>
          )}
        </div>
      )}

      {/* Main Visualization */}
      <UMAPVisualization
        entries={entries}
        collection={collection}
        onNodeClick={handleNodeClick}
        onCollectionChange={handleCollectionChange}
        collections={collections}
        newlyAddedEntryId={newlyAddedEntryId}
      />

      {/* Sidebar */}
      <Sidebar
        entry={selectedEntry}
        isOpen={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        onAddComment={handleAddComment}
        onDeleteEntry={handleDeleteEntry}
        onDeleteComment={handleDeleteComment}
        isAdmin={isAdmin}
      />

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLogin onLogin={handleAdminLogin} />
      )}
    </div>
  )
}
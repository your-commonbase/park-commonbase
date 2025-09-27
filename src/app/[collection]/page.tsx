'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import UMAPVisualization from '@/components/UMAPVisualization'
import Sidebar from '@/components/Sidebar'
import SettingsModal from '@/components/SettingsModal'
import LedgerView from '@/components/LedgerView'
import QRCodeComponent from '@/components/QRCode'
import { Entry } from '@/types'

export default function CollectionPage() {
  const params = useParams()
  const router = useRouter()
  const collectionParam = params?.collection as string

  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [collection, setCollection] = useState(collectionParam || 'default')
  const [collections, setCollections] = useState<string[]>(['default'])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [newlyAddedEntryId, setNewlyAddedEntryId] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'graph' | 'ledger'>('graph')
  const [isLoadingEntries, setIsLoadingEntries] = useState(false)
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | undefined>(undefined)

  // Check for admin status on page load
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/admin_status')
        const { isAdmin: adminStatus } = await response.json()
        setIsAdmin(adminStatus)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      }
    }

    checkAdminStatus()
  }, [])

  // Update collection when URL parameter changes
  useEffect(() => {
    if (collectionParam) {
      setCollection(collectionParam)
    }
  }, [collectionParam])

  // Load all available collections
  useEffect(() => {
    fetch('/api/collections')
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

  // Load data for current collection with debouncing
  useEffect(() => {
    setIsLoadingEntries(true)

    // Add a small delay to prevent rapid requests when switching collections
    const timeoutId = setTimeout(() => {
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
        .finally(() => {
          setIsLoadingEntries(false)
        })
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      setIsLoadingEntries(false)
    }
  }, [collection])

  const handleNodeClick = (entry: Entry) => {
    // If sidebar is open and it's the same entry, close it
    if (selectedEntry && selectedEntry.id === entry.id) {
      setSelectedEntry(null)
    } else {
      // Always open the clicked entry (even if another entry was selected)
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
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Admin login error:', error)
      return false
    }
  }

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin_signout', { method: 'POST' })
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsAdmin(false)
    }
  }

  const handleAddComment = async (parentId: string, content: string) => {

    try {
      const response = await fetch('/api/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        headers: {
          },
        credentials: 'include', // Include cookies in the request
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
        headers: {
          },
        credentials: 'include', // Include cookies in the request
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

  const handleAddEntry = async (data: unknown, type: 'text' | 'image' | 'audio' | 'csv') => {
    setIsAddingEntry(true)

    try {
      let response
      let result

      if (type === 'text') {
        response = await fetch('/api/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
              },
          body: JSON.stringify(data),
        })
        result = await response.json()
      } else if (type === 'image') {
        response = await fetch('/api/add_image', {
          method: 'POST',
          headers: {
              },
          body: data as FormData,
        })
        result = await response.json()
      } else if (type === 'audio') {
        response = await fetch('/api/add_audio', {
          method: 'POST',
          headers: {
              },
          body: data as FormData,
        })
        result = await response.json()
      } else if (type === 'csv') {
        response = await fetch('/api/batch_upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
              },
          body: JSON.stringify(data),
        })
        result = await response.json()
      }

      if (response && response.ok) {
        if (result && result.id) {
          setNewlyAddedEntryId(result.id)
          setTimeout(() => setNewlyAddedEntryId(undefined), 3000)
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
        const updatedEntries = await fetch(`/api/collection/${collection}`).then(res => res.json())
        setEntries(updatedEntries)
      }
    } catch (error) {
      console.error('Error adding entry:', error)
    } finally {
      setIsAddingEntry(false)
    }
  }


  const handleCreateCollection = async (name: string) => {

    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })

    const result = await response.json()

    if (response.ok) {
      // Add "hello world" entry to the new collection
      try {
        await fetch('/api/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
              },
          body: JSON.stringify({
            data: 'hello world',
            metadata: {
              type: 'text',
            },
            collection: name,
          }),
        })
      } catch (error) {
        console.error('Failed to add hello world entry:', error)
      }

      const updatedCollections = await fetch('/api/collections')
        .then(res => res.json())
        .then((data: Array<{ name: string }>) => data.map(col => col.name))

      setCollections(updatedCollections)
      router.push(`/${name}`)
    } else {
      throw new Error(result.error || 'Failed to create collection')
    }
  }

  const handleShowInGraph = (entry: Entry) => {
    // Switch to graph view
    setViewMode('graph')
    // Highlight the selected entry
    setHighlightedEntryId(entry.id)
    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedEntryId(undefined), 3000)
    // Close any open sidebar
    setSelectedEntry(null)
  }


  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* View Toggle */}
      <div className="fixed top-4 left-4 z-50 flex bg-card border border-border rounded-lg shadow-md overflow-hidden sm:absolute sm:top-4 sm:left-4 safe-area-inset-top safe-area-inset-left">
        <button
          onClick={() => setViewMode('graph')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'graph'
              ? 'bg-blue-600 text-white'
              : 'text-card-foreground hover:bg-accent'
          }`}
        >
          Graph
        </button>
        <button
          onClick={() => setViewMode('ledger')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'ledger'
              ? 'bg-blue-600 text-white'
              : 'text-card-foreground hover:bg-accent'
          }`}
        >
          Ledger
        </button>
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettingsModal(true)}
        className="fixed top-4 right-4 z-50 p-3 bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-all hover:bg-accent text-card-foreground sm:absolute sm:top-4 sm:right-4 safe-area-inset-top safe-area-inset-right"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        {isAdmin && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </button>

      {/* Main Content */}
      <div className="relative w-full h-full">
        {isLoadingEntries && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-muted-foreground">Loading {collection} entries...</p>
            </div>
          </div>
        )}

        {viewMode === 'graph' ? (
          <>
            <UMAPVisualization
              entries={entries}
              collection={collection}
              onNodeClick={handleNodeClick}
              onCollectionChange={handleCollectionChange}
              collections={collections}
              newlyAddedEntryId={newlyAddedEntryId || highlightedEntryId}
              onGraphClick={() => setSelectedEntry(null)}
            />
            {/* QR Code - Bottom Right Corner */}
            <div className="fixed bottom-4 right-4 z-40 sm:absolute sm:bottom-4 sm:right-4 safe-area-inset-bottom safe-area-inset-right">
              <QRCodeComponent
                url={typeof window !== 'undefined' ? window.location.href : ''}
                size={64}
                className="opacity-80 hover:opacity-100 transition-opacity sm:w-20 sm:h-20"
              />
            </div>
          </>
        ) : (
          <LedgerView
            entries={entries}
            onEntryClick={handleNodeClick}
            onShowInGraph={handleShowInGraph}
          />
        )}
      </div>

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

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isAdmin={isAdmin}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
        collection={collection}
        collections={collections}
        onCollectionChange={handleCollectionChange}
        onCreateCollection={handleCreateCollection}
        onAddEntry={handleAddEntry}
        isAddingEntry={isAddingEntry}
      />
    </div>
  )
}
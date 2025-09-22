'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import UMAPVisualization from '@/components/UMAPVisualization'
import Sidebar from '@/components/Sidebar'
import SettingsModal from '@/components/SettingsModal'

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

export default function Home() {
  const router = useRouter()
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [collection, setCollection] = useState('default')
  const [collections, setCollections] = useState<string[]>(['default'])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [apiKey] = useState(process.env.NEXT_PUBLIC_API_KEY || '')
  const [newEntryText, setNewEntryText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [newlyAddedEntryId, setNewlyAddedEntryId] = useState<string | undefined>(undefined)

  // Check for admin cookie on page load
  useEffect(() => {
    const adminCookie = Cookies.get('park-admin')
    if (adminCookie === 'true') {
      setIsAdmin(true)
    }
  }, [])

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
        Cookies.set('park-admin', 'true', { expires: 7 })
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Admin login error:', error)
      return false
    }
  }

  const handleAdminLogout = () => {
    setIsAdmin(false)
    Cookies.remove('park-admin')
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

  const handleAddEntry = async (data: any, type: 'text' | 'image' | 'audio' | 'csv') => {
    setIsAddingEntry(true)
    const serverApiKey = 'testkey'

    try {
      let response
      let result

      if (type === 'text') {
        response = await fetch('/api/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': serverApiKey,
          },
          body: JSON.stringify(data),
        })
        result = await response.json()
      } else if (type === 'image') {
        response = await fetch('/api/add_image', {
          method: 'POST',
          headers: {
            'x-api-key': serverApiKey,
          },
          body: data,
        })
        result = await response.json()
      } else if (type === 'audio') {
        response = await fetch('/api/add_audio', {
          method: 'POST',
          headers: {
            'x-api-key': serverApiKey,
          },
          body: data,
        })
        result = await response.json()
      } else if (type === 'csv') {
        response = await fetch('/api/batch_upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': serverApiKey,
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
    const serverApiKey = 'testkey'

    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': serverApiKey,
      },
      body: JSON.stringify({ name }),
    })

    const result = await response.json()

    if (response.ok) {
      const updatedCollections = await fetch('/api/collections', {
        headers: { 'x-api-key': serverApiKey },
      })
        .then(res => res.json())
        .then(data => data.map((col: any) => col.name))

      setCollections(updatedCollections)
      router.push(`/${name}`)
    } else {
      throw new Error(result.error || 'Failed to create collection')
    }
  }


  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Settings Button */}
      <button
        onClick={() => setShowSettingsModal(true)}
        className="absolute top-4 right-4 z-50 p-3 bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-all hover:bg-gray-50"
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

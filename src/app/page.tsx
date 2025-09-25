'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import SettingsModal from '@/components/SettingsModal'

interface Collection {
  name: string
  count: number
}

export default function Home() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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
          setCollections(data)
          if (data.length > 0 && !selectedCollection) {
            setSelectedCollection(data[0].name)
          }
        }
        setIsLoading(false)
      })
      .catch(error => {
        console.error('Error loading collections:', error)
        setIsLoading(false)
      })
  }, [selectedCollection])

  const handleCollectionSelect = () => {
    if (selectedCollection) {
      router.push(`/${selectedCollection}`)
    }
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

  const handleCreateCollection = async (name: string) => {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'testkey',
        },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        // Reload collections
        const updatedResponse = await fetch('/api/collections', {
          headers: { 'x-api-key': 'testkey' },
        })
        const updatedCollections = await updatedResponse.json()
        if (Array.isArray(updatedCollections)) {
          setCollections(updatedCollections)
          setSelectedCollection(name)
        }
      }
    } catch (error) {
      console.error('Error creating collection:', error)
      throw error
    }
  }

  const handleAddEntry = async (data: FormData | Record<string, unknown>, type: string) => {
    // This is not used on the home page but required by SettingsModal
    throw new Error('Entry creation not available on home page')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading collections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-2xl w-full text-center">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Park Commonbase
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              An intelligent knowledge management system for organizing and exploring your data
            </p>
            <p className="text-lg text-gray-500">
              Create collections of text, images, and audio. Visualize connections with AI-powered
              semantic clustering and explore your knowledge through interactive graphs or detailed ledgers.
            </p>
          </div>

          {/* Collection Selector */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">
              Choose a Collection
            </h2>

            {collections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No collections found</p>
                {isAdmin && (
                  <p className="text-sm text-gray-400">
                    Create your first collection using the settings menu
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-w-md mx-auto">
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {collections.map((collection) => (
                      <option key={collection.name} value={collection.name}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCollectionSelect}
                  disabled={!selectedCollection}
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Explore Collection
                </button>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Graph View</h3>
              <p className="text-gray-600 text-sm">
                Visualize your data as an interactive network using UMAP clustering
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Ledger View</h3>
              <p className="text-gray-600 text-sm">
                Browse entries in a structured table with metadata and embeddings
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Powered</h3>
              <p className="text-gray-600 text-sm">
                Automatic transcription, embedding generation, and semantic search
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-gray-400 text-sm">
            {isAdmin ? (
              <>Admin access enabled • Use settings to manage collections</>
            ) : (
              <>Need to create collections? Sign in as admin using the settings menu</>
            )}
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          isAdmin={isAdmin}
          onAdminLogin={handleAdminLogin}
          collection="default"
          collections={collections.map(c => c.name)}
          onCollectionChange={() => {}}
          onCreateCollection={handleCreateCollection}
          onAddEntry={handleAddEntry}
          isAddingEntry={false}
        />
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SettingsModal from '@/components/SettingsModal'
import Link from 'next/link'

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
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading collections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Settings Button */}
      <button
        onClick={() => setShowSettingsModal(true)}
        className="absolute top-4 right-4 z-50 p-3 bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-all hover:bg-accent text-card-foreground"
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
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Park Commonbase
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Are you curious about what your fellow park-goers are thinking? What if you have something in common? Find out by adding an entry. You can write some text or air drop me a voice memo, an image, a Spotify link or YouTube video, or even leave a comment on an existing entry. You can add your Instagram handle if you want to be found later by other people. Then explore what has already been added by going through the graph and tapping on the nodes that people have already added. If you want to see this graph later, you can copy the permalink by scanning the QR code on the bottom right. You can make your own here and start <Link href='https://github.com/your-commonbase/park-commonbase' target='_blank' rel='noopener noreferrer' style={{
              textDecoration: 'underline',
              textDecorationColor: 'rgba(59, 130, 246, 0.5)',
              textUnderlineOffset: '2px',
              color: 'inherit',
            
              }}>the GitHub repo that powers Park Commonbase</Link> or follow us on Instagram through our <Link href="https://linktr.ee/yourcommonbase?utm_source=linktree_profile_share&ltsid=161c666c-7081-45fd-80e4-702c94e76f78" target="_blank" rel="noopener noreferrer" style={{
              textDecoration: 'underline',
              textDecorationColor: 'rgba(59, 130, 246, 0.5)',
              textUnderlineOffset: '2px',
              color: 'inherit',
            
              }}>LinkTree</Link>.
            </p>
          </div>

          {/* Collection Selector */}
          <div className="bg-card rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-card-foreground mb-6">
              Choose a Collection
            </h2>

            {collections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No collections found</p>
                {isAdmin && (
                  <p className="text-sm text-muted-foreground">
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
                    className="w-full px-4 py-3 text-lg bg-input border border-border text-input-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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


          {/* Footer */}
          <p className="text-muted-foreground text-sm">
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
          onAdminLogout={() => setIsAdmin(false)}
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
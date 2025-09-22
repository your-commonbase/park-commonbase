'use client'

import { useState } from 'react'
import { X, Settings, Upload } from 'lucide-react'
import AudioRecorder from '@/components/AudioRecorder'
import { useUploadThing } from '@/lib/uploadthing-client'

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
  const [activeTab, setActiveTab] = useState<'admin' | 'collections' | 'upload'>('collections')
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
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

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
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        setUploadedAudioUrl(res[0].url)
        setIsUploading(false)
      }
    },
    onUploadError: (error) => {
      console.error('Audio upload error:', error)
      setIsUploading(false)
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
    if ((!newEntryText.trim() && !selectedFile && !uploadedImageUrl && !uploadedAudioUrl && !csvData.trim()) || isAddingEntry) return

    try {
      if (activeUploadTab === 'text') {
        await onAddEntry({
          data: newEntryText,
          metadata: {
            type: 'text',
            author: authorName.trim() ? { name: authorName.trim() } : undefined,
          },
          collection,
        }, 'text')
      } else if (activeUploadTab === 'image') {
        if (uploadedImageUrl) {
          // Use UploadThing URL
          const formData = new FormData()
          formData.append('uploadthingUrl', uploadedImageUrl)
          formData.append('collection', collection)
          if (authorName.trim()) {
            formData.append('metadata', JSON.stringify({
              author: { name: authorName.trim() }
            }))
          }
          await onAddEntry(formData, 'image')
        } else if (selectedFile) {
          // Fallback to direct upload
          const formData = new FormData()
          formData.append('image', selectedFile)
          formData.append('collection', collection)
          if (authorName.trim()) {
            formData.append('metadata', JSON.stringify({
              author: { name: authorName.trim() }
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
          if (authorName.trim()) {
            formData.append('metadata', JSON.stringify({
              author: { name: authorName.trim() }
            }))
          }
          await onAddEntry(formData, 'audio')
        } else if (selectedFile) {
          // Fallback to direct upload
          const formData = new FormData()
          formData.append('audio', selectedFile)
          formData.append('collection', collection)
          if (authorName.trim()) {
            formData.append('metadata', JSON.stringify({
              author: { name: authorName.trim() }
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

    // Directly create the audio entry with temporary file (bypass UploadThing for recordings)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('collection', collection)
      if (authorName.trim()) {
        formData.append('metadata', JSON.stringify({
          author: { name: authorName.trim() }
        }))
      }

      await onAddEntry(formData, 'audio')

      // Reset states after successful entry creation
      setSelectedFile(null)
      setAuthorName('')
      setIsUploading(false)
      onClose() // Close modal after successful recording and transcription
    } catch (error) {
      console.error('Failed to create audio entry from recording:', error)
      setIsUploading(false)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings size={20} />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('collections')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'collections'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Collections
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'admin'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
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
                  : 'text-gray-600 hover:text-gray-800'
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Collection</label>
                <select
                  value={collection}
                  onChange={(e) => {
                    onCollectionChange(e.target.value)
                    onClose() // Auto close modal after switching collection
                  }}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="border-t border-gray-200 pt-4">
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
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
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

          {/* Admin Tab */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              {!isAdmin ? (
                !showAdminLogin ? (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Admin access required for advanced features</p>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        : 'text-gray-600 hover:text-gray-800'
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
                      className="w-full p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full p-3 border border-gray-300 rounded"
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
                      <p className="text-sm text-gray-600 mt-2">Selected: {selectedFile.name}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">Images are hosted on UploadThing and will be automatically captioned using AI</p>
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
                        className="w-full p-3 border border-gray-300 rounded"
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
                        <p className="text-sm text-gray-600 mt-2">Selected: {selectedFile.name}</p>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">OR</span>
                      </div>
                    </div>

                    <AudioRecorder
                      onRecordingComplete={handleRecordingComplete}
                      disabled={isAddingEntry}
                    />

                    <p className="text-sm text-gray-600">Audio files are hosted on UploadThing and will be automatically transcribed using AI</p>
                  </div>
                )}

                {/* CSV Upload */}
                {activeUploadTab === 'csv' && (
                  <div>
                    <textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="Paste CSV data here (data,author columns)..."
                      className="w-full p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                    <p className="text-sm text-gray-600 mt-2">Format: Each row should have 'data' and 'author' columns</p>
                  </div>
                )}

                {/* Author Field (not for CSV) */}
                {activeUploadTab !== 'csv' && (
                  <div>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Author name (optional)"
                      className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    (activeUploadTab === 'csv' && !csvData.trim()) ||
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
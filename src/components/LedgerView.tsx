'use client'

import { useState, useEffect } from 'react'

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

interface LedgerViewProps {
  entries: Entry[]
  onEntryClick: (entry: Entry) => void
  onShowInGraph?: (entry: Entry) => void
}

export default function LedgerView({ entries, onEntryClick, onShowInGraph }: LedgerViewProps) {
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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const formatEmbedding = (embedding: number[]) => {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      return 'N/A'
    }
    return embedding.slice(0, 3).map(n => n.toFixed(3)).join(', ')
  }

  const getAuthor = (metadata: any) => {
    if (metadata?.author?.name) {
      return metadata.author.name
    }
    return 'Anonymous'
  }

  const getEntryType = (metadata: any) => {
    return metadata?.type || 'text'
  }

  // Sort entries by creation date, newest first
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="w-full h-full overflow-auto bg-background">
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-foreground">Collection Ledger</h2>
          <p className="text-sm text-muted-foreground">{entries.length} entries total</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-2 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="border border-border px-4 py-2 text-left font-medium text-muted-foreground">
                  Description
                </th>
                <th className="border border-border px-4 py-2 text-left font-medium text-muted-foreground">
                  Author
                </th>
                <th className="border border-border px-4 py-2 text-left font-medium text-muted-foreground">
                  Created At
                </th>
                <th className="border border-border px-4 py-2 text-left font-medium text-muted-foreground">
                  Embedding (first 3)
                </th>
                <th className="border border-border px-4 py-2 text-left font-medium text-muted-foreground">
                  Comments
                </th>
                <th className="border border-border px-4 py-2 text-center font-medium text-muted-foreground">
                  Show in Graph
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    if (getEntryType(entry.metadata) === 'image') {
                      // Open fullscreen image modal for image entries
                      const imageUrl = entry.metadata.imageUrl || `/images/${entry.metadata.imageFile}`
                      setFullscreenImage({ url: imageUrl, alt: entry.data })
                    } else {
                      // Regular entry click behavior for non-image entries
                      onEntryClick(entry)
                    }
                  }}
                >
                  <td className="border border-border px-4 py-2">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      getEntryType(entry.metadata) === 'image' ? 'bg-yellow-500' :
                      getEntryType(entry.metadata) === 'audio' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}></span>
                    {getEntryType(entry.metadata)}
                  </td>
                  <td className="border border-border px-4 py-2 max-w-md">
                    {getEntryType(entry.metadata) === 'image' && (entry.metadata.imageUrl || entry.metadata.imageFile) ? (
                      <img
                        src={entry.metadata.imageUrl || `/images/${entry.metadata.imageFile}`}
                        alt={entry.data}
                        className="w-16 h-12 object-cover rounded border"
                        loading="lazy"
                      />
                    ) : (
                      truncateText(entry.data)
                    )}
                  </td>
                  <td className="border border-border px-4 py-2">
                    {getAuthor(entry.metadata)}
                  </td>
                  <td className="border border-border px-4 py-2 whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="border border-border px-4 py-2 font-mono text-xs">
                    {formatEmbedding(entry.embedding)}
                  </td>
                  <td className="border border-border px-4 py-2 text-center">
                    {entry.comments && entry.comments.length > 0 ? (
                      <span className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded">
                        {entry.comments.length}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="border border-border px-4 py-2 text-center">
                    {onShowInGraph && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation() // Prevent row click
                          onShowInGraph(entry)
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        title={`Show ${entry.data.substring(0, 50)}... in graph view`}
                      >
                        Show in Graph
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No entries in this collection</p>
          </div>
        )}
      </div>

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
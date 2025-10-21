'use client'

import { useState, useEffect } from 'react'
import { X, Play, Pause, Trash2 } from 'lucide-react'
import SpotifyEmbed from './SpotifyEmbed'
import YouTubeEmbed from './YouTubeEmbed'
import { Entry } from '@/types'

// Helper to highlight ==text== with <mark>
function highlightMarked(text: string): string {
  return text.replace(/==([^=]+)==/g, '<mark>$1</mark>');
}

interface SidebarProps {
  entry: Entry | null
  isOpen: boolean
  onClose: () => void
  onAddComment: (parentId: string, content: string) => Promise<void>
  onDeleteEntry: (id: string) => void
  onDeleteComment: (id: string) => void
  isAdmin: boolean
}

// AudioPlayer component for individual audio entries
function AudioPlayer({ audioUrl, entryId }: { audioUrl: string; entryId: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Reset audio state when entry changes
    if (audio) {
      audio.pause()
      setAudio(null)
      setIsPlaying(false)
    }
  }, [audioUrl, entryId, audio])

  useEffect(() => {
    // Cleanup audio when component unmounts
    return () => {
      if (audio) {
        audio.pause()
        setAudio(null)
      }
    }
  }, [audio])

  const handlePlayAudio = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        audio.play()
        setIsPlaying(true)
      }
    } else {
      const newAudio = new Audio(audioUrl)
      newAudio.onended = () => setIsPlaying(false)
      newAudio.onpause = () => setIsPlaying(false)
      newAudio.onerror = () => {
        console.error('Audio failed to load:', audioUrl)
        setIsPlaying(false)
      }
      newAudio.play().catch((error) => {
        console.error('Audio play failed:', error)
        setIsPlaying(false)
      })
      setIsPlaying(true)
      setAudio(newAudio)
    }
  }

  return (
    <button
      onClick={handlePlayAudio}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
    >
      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      {isPlaying ? 'Pause' : 'Play'} Audio
    </button>
  )
}

export default function Sidebar({
  entry,
  isOpen,
  onClose,
  onAddComment,
  onDeleteEntry,
  onDeleteComment,
  isAdmin,
}: SidebarProps) {
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !entry || isAddingComment) return

    setIsAddingComment(true)
    try {
      await onAddComment(entry.id, newComment)
      setNewComment('')
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setIsAddingComment(false)
    }
  }


  if (!isOpen || !entry) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-lg z-50 transform transition-transform duration-300 ease-in-out">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Entry Details</h2>
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => onDeleteEntry(entry.id)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                title="Delete Entry"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:bg-muted rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Entry Type Badge */}
          <div className="mb-4">
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              entry.metadata.type === 'audio' ? 'bg-green-100 text-green-800' :
              entry.metadata.type === 'image' ? 'bg-yellow-100 text-yellow-800' :
              entry.metadata.type === 'youtube' ? 'bg-red-100 text-red-800' :
              entry.metadata.type === 'spotify' ? 'bg-green-100 text-green-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {entry.metadata.type || 'text'}
            </span>
          </div>

          {/* Image Display */}
          {entry.metadata.type === 'image' && (entry.metadata.imageUrl || entry.metadata.imageFile) && (
            <div className="mb-4">
              <img
                src={entry.metadata.imageUrl || `/images/${entry.metadata.imageFile}`}
                alt="Entry image"
                className="w-full h-48 object-cover rounded border"
              />
            </div>
          )}

          {/* Audio Player */}
          {entry.metadata.type === 'audio' && (entry.metadata.audioUrl || entry.metadata.audioFile) && (
            <div className="mb-4">
              <AudioPlayer
                audioUrl={entry.metadata.audioUrl || `/audio/${entry.metadata.audioFile}`}
                entryId={entry.id}
              />
            </div>
          )}

          {/* YouTube Embed */}
          {entry.metadata.type === 'youtube' && entry.metadata.embedUrl && (
            <div className="mb-4">
              <YouTubeEmbed
                embedUrl={entry.metadata.embedUrl}
                title={entry.metadata.title}
                originalUrl={entry.metadata.originalUrl}
                videoId={entry.metadata.videoId}
              />
            </div>
          )}

          {/* Spotify Embed */}
          {entry.metadata.type === 'spotify' && entry.metadata.embedUrl && (
            <div className="mb-4">
              <SpotifyEmbed
                embedUrl={entry.metadata.embedUrl}
                title={entry.metadata.title}
                originalUrl={entry.metadata.originalUrl}
              />
            </div>
          )}

          {/* Entry Text - Hide for image entries */}
          {entry.metadata.type !== 'image' && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">
                {entry.metadata.type === 'audio' ? 'Transcription:' :
                 entry.metadata.type === 'youtube' ? 'Video Title:' :
                 entry.metadata.type === 'spotify' ? 'Track/Playlist:' :
                 'Content:'}
              </h3>
              <p
                className="text-foreground whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightMarked(entry.data) }}
              />
            </div>
          )}

          {/* Metadata */}
          {entry.metadata.author && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Author:</h3>
              <div className="text-sm text-muted-foreground">
                {entry.metadata.author.name && (
                  <p>Name: {entry.metadata.author.name}</p>
                )}
                {entry.metadata.author.instagram && (
                  <p>
                    Instagram:
                    <a
                      href={`https://instagram.com/${entry.metadata.author.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      @{entry.metadata.author.instagram}
                    </a>
                  </p>
                )}
                {entry.metadata.author.url && entry.metadata.author.url !== `https://instagram.com/${entry.metadata.author.instagram}` && (
                  <p>URL: <a href={entry.metadata.author.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{entry.metadata.author.url}</a></p>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="mb-6 text-sm text-muted-foreground">
            <p>Created: {new Date(entry.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(entry.updatedAt).toLocaleString()}</p>
          </div>

          {/* Comments */}
          <div className="border-t border-border pt-6">
            <h3 className="font-medium mb-4">Comments ({entry.comments?.length || 0})</h3>

            {/* Add Comment Form (only in admin mode) */}
            {isAdmin && (
              <form onSubmit={handleAddComment} className="mb-4">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-border bg-background text-foreground rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={isAddingComment}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isAddingComment}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isAddingComment ? 'Processing...' : 'Add Comment'}
                </button>
              </form>
            )}

            {/* Comments List */}
            <div className="space-y-3">
              {entry.comments?.map((comment) => (
                <div key={comment.id} className="p-3 bg-muted rounded border border-border">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      comment.metadata.type === 'audio' ? 'bg-green-100 text-green-800' :
                      comment.metadata.type === 'image' ? 'bg-yellow-100 text-yellow-800' :
                      comment.metadata.type === 'youtube' ? 'bg-red-100 text-red-800' :
                      comment.metadata.type === 'spotify' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {comment.metadata.type || 'text'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {comment.metadata.type === 'image' && (comment.metadata.imageUrl || comment.metadata.imageFile) && (
                    <img
                      src={comment.metadata.imageUrl || `/images/${comment.metadata.imageFile}`}
                      alt="Comment image"
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  )}

                  {comment.metadata.type === 'audio' && (comment.metadata.audioUrl || comment.metadata.audioFile) && (
                    <div className="mb-2">
                      <AudioPlayer
                        audioUrl={comment.metadata.audioUrl || `/audio/${comment.metadata.audioFile}`}
                        entryId={comment.id}
                      />
                    </div>
                  )}

                  <p
                    className="text-sm text-foreground mb-1"
                    dangerouslySetInnerHTML={{ __html: highlightMarked(comment.data) }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
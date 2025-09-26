'use client'

import { useState, useCallback } from 'react'

interface YouTubeEmbedProps {
  embedUrl: string
  title?: string
  originalUrl?: string
  videoId?: string
}

export default function YouTubeEmbed({ embedUrl, title, originalUrl, videoId }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Enhance embed URL for better mobile compatibility
  const enhancedEmbedUrl = `${embedUrl}?enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}&rel=0&modestbranding=1&playsinline=1`

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    setHasError(false)
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
    setIsLoaded(false)
  }, [])

  const handleFallbackClick = () => {
    if (originalUrl) {
      window.open(originalUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-card-foreground truncate">{title}</h3>
          {originalUrl && (
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-red-600 hover:text-red-500 transition-colors"
            >
              Watch on YouTube
            </a>
          )}
        </div>
      )}
      <div className="relative aspect-video w-full bg-gray-100 rounded-lg overflow-hidden">
        {hasError ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={handleFallbackClick}
          >
            <div className="text-4xl mb-2">📺</div>
            <p className="text-sm text-center px-4">
              Unable to load video.
              <br />
              <span className="text-red-600">Tap to watch on YouTube</span>
            </p>
          </div>
        ) : (
          <>
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600">
                <div className="text-4xl animate-pulse">📺</div>
              </div>
            )}
            <iframe
              src={enhancedEmbedUrl}
              title={title || `YouTube video ${videoId}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 w-full h-full"
              onLoad={handleLoad}
              onError={handleError}
              style={{
                opacity: isLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out'
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
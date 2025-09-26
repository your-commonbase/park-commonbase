'use client'

interface YouTubeEmbedProps {
  embedUrl: string
  title?: string
  originalUrl?: string
  videoId?: string
}

export default function YouTubeEmbed({ embedUrl, title, originalUrl, videoId }: YouTubeEmbedProps) {
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
      <div className="relative aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title || `YouTube video ${videoId}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full rounded-lg"
        />
      </div>
    </div>
  )
}
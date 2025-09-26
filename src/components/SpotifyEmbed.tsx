'use client'

interface SpotifyEmbedProps {
  embedUrl: string
  title?: string
  originalUrl?: string
}

export default function SpotifyEmbed({ embedUrl, title, originalUrl }: SpotifyEmbedProps) {
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
              className="text-xs text-green-600 hover:text-green-500 transition-colors"
            >
              Open in Spotify
            </a>
          )}
        </div>
      )}
      <iframe
        src={embedUrl}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-lg"
      />
    </div>
  )
}
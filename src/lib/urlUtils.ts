export interface DetectedUrlInfo {
  type: 'spotify' | 'youtube' | 'text'
  url?: string
  id?: string
  embedUrl?: string
}

export function detectUrlType(text: string): DetectedUrlInfo {
  // Check for Spotify URLs
  const spotifyRegex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)(?:\?.*)?/
  const spotifyMatch = text.match(spotifyRegex)

  if (spotifyMatch) {
    const [fullMatch, type, id] = spotifyMatch
    return {
      type: 'spotify',
      url: fullMatch.startsWith('http') ? fullMatch : `https://open.spotify.com/${type}/${id}`,
      id,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`
    }
  }

  // Check for YouTube URLs
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:\S+)?/
  const youtubeMatch = text.match(youtubeRegex)

  if (youtubeMatch) {
    const [fullMatch, id] = youtubeMatch
    return {
      type: 'youtube',
      url: fullMatch.startsWith('http') ? fullMatch : `https://www.youtube.com/watch?v=${id}`,
      id,
      embedUrl: `https://www.youtube.com/embed/${id}`
    }
  }

  return { type: 'text' }
}

export async function getYouTubeTitle(videoId: string): Promise<string> {
  try {
    // Use YouTube oEmbed API to get video info
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
    if (response.ok) {
      const data = await response.json()
      return data.title || `YouTube Video: ${videoId}`
    }
  } catch (error) {
    console.error('Error fetching YouTube title:', error)
  }
  return `YouTube Video: ${videoId}`
}

export async function getSpotifyTitle(type: string, id: string): Promise<string> {
  try {
    // Try Spotify's oEmbed API first - this is the most reliable method
    const spotifyUrl = `https://open.spotify.com/${type}/${id}`
    const oembedResponse = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (oembedResponse.ok) {
      const data = await oembedResponse.json()
      console.log('Spotify oEmbed response:', data) // Debug log

      if (data.title) {
        return data.title
      }

      // Sometimes the title might be in a different field
      if (data.html) {
        const titleMatch = data.html.match(/title="([^"]+)"/i)
        if (titleMatch && titleMatch[1]) {
          return titleMatch[1]
        }
      }
    } else {
      console.log('Spotify oEmbed failed with status:', oembedResponse.status)
    }
  } catch (error) {
    console.error('Error fetching Spotify title via oEmbed:', error)
  }

  // Fallback: Create a descriptive title based on the type and ID
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)

  // Generate a more user-friendly fallback
  switch (type.toLowerCase()) {
    case 'track':
      return `🎵 Spotify Track (${id.substring(0, 8)}...)`
    case 'playlist':
      return `🎵 Spotify Playlist (${id.substring(0, 8)}...)`
    case 'album':
      return `🎵 Spotify Album (${id.substring(0, 8)}...)`
    case 'artist':
      return `🎵 Spotify Artist (${id.substring(0, 8)}...)`
    default:
      return `🎵 Spotify ${typeLabel} (${id.substring(0, 8)}...)`
  }
}

export function extractUrlFromText(text: string): { cleanText: string; url?: string } {
  const urlInfo = detectUrlType(text)

  if (urlInfo.type !== 'text' && urlInfo.url) {
    // Remove the URL from the text and return clean text
    const cleanText = text.replace(urlInfo.url, '').trim()
    return {
      cleanText: cleanText || urlInfo.url, // Fallback to URL if no other text
      url: urlInfo.url
    }
  }

  return { cleanText: text }
}
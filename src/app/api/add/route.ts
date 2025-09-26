import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/openai'
import { validateApiKey, validateSession } from '@/lib/auth'
import { detectUrlType, getYouTubeTitle, getSpotifyTitle } from '@/lib/urlUtils'

export async function POST(request: NextRequest) {
  try {
    // Check for API key first (for external integrations)
    const apiKey = request.headers.get('x-api-key')
    if (apiKey && validateApiKey(apiKey)) {
      // API key is valid, proceed (for external integrations)
    } else {
      // Fall back to session-based auth for admin UI
      const sessionToken = request.cookies.get('admin_session')?.value
      if (!sessionToken || !validateSession(sessionToken)) {
        return NextResponse.json({ error: 'Authentication required. Please sign in as admin.' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { data, metadata, collection = 'default', parentId } = body

    if (!data) {
      return NextResponse.json({ error: 'Data is required' }, { status: 400 })
    }

    // Detect if the text contains a special URL
    const urlInfo = detectUrlType(data)
    let finalData = data
    let finalMetadata = metadata || {}

    if (urlInfo.type === 'youtube' && urlInfo.id) {
      // Extract title from YouTube
      const title = await getYouTubeTitle(urlInfo.id)
      finalData = title
      finalMetadata = {
        ...finalMetadata,
        type: 'youtube',
        originalUrl: urlInfo.url,
        embedUrl: urlInfo.embedUrl,
        videoId: urlInfo.id,
        title
      }
    } else if (urlInfo.type === 'spotify' && urlInfo.id) {
      // Extract title from Spotify
      const spotifyType = urlInfo.url?.match(/spotify\.com\/(\w+)\//)?.[1] || 'track'
      const title = await getSpotifyTitle(spotifyType, urlInfo.id)
      finalData = title
      finalMetadata = {
        ...finalMetadata,
        type: 'spotify',
        originalUrl: urlInfo.url,
        embedUrl: urlInfo.embedUrl,
        spotifyId: urlInfo.id,
        spotifyType,
        title
      }
    } else {
      // Regular text entry
      finalMetadata = {
        ...finalMetadata,
        type: 'text'
      }
    }

    // Generate embedding for the final data (title for URLs, original text for regular entries)
    const embedding = await generateEmbedding(finalData)

    // Create entry using raw SQL for vector insertion
    const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
    const insertSQL = `
      INSERT INTO ${tableName} (id, data, metadata, embedding, collection, parent_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2::jsonb, $3::vector, $4, $5::uuid, NOW(), NOW())
      RETURNING id, created_at, updated_at
    `

    const result = await prisma.$queryRawUnsafe(
      insertSQL,
      finalData,
      JSON.stringify(finalMetadata),
      JSON.stringify(embedding),
      collection,
      parentId || null
    ) as any[]

    const entry = {
      id: result[0].id,
      createdAt: result[0].created_at,
      updatedAt: result[0].updated_at
    }

    // If this is a comment, update the parent's comment_ids
    if (parentId) {
      const parentQuery = `SELECT metadata FROM ${tableName} WHERE id = $1::uuid`
      const parentResult = await prisma.$queryRawUnsafe(parentQuery, parentId) as any[]

      if (parentResult.length > 0) {
        const parentMetadata = parentResult[0].metadata || {}
        const commentIds = parentMetadata.comment_ids || []
        commentIds.push(entry.id)

        const updateParentSQL = `
          UPDATE ${tableName}
          SET metadata = $1::jsonb, updated_at = NOW()
          WHERE id = $2::uuid
        `
        await prisma.$queryRawUnsafe(
          updateParentSQL,
          JSON.stringify({
            ...parentMetadata,
            comment_ids: commentIds,
          }),
          parentId
        )
      }
    }

    return NextResponse.json({ id: entry.id, message: 'Entry created successfully' })
  } catch (error) {
    console.error('Error creating entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateApiKey, validateSession } from '@/lib/auth'

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
    const {
      transcription,
      embedding,
      uploadthingUrl,
      metadata = {},
      collection = 'default',
      parentId
    } = body

    if (!transcription || !embedding || !uploadthingUrl) {
      return NextResponse.json({
        error: 'Transcription, embedding, and UploadThing URL are required'
      }, { status: 400 })
    }

    // Create entry with pre-processed audio data using raw SQL for vector insertion
    const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
    const insertSQL = `
      INSERT INTO ${tableName} (id, data, metadata, embedding, collection, parent_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2::jsonb, $3::vector, $4, $5::uuid, NOW(), NOW())
      RETURNING id, created_at, updated_at
    `

    const result = await prisma.$queryRawUnsafe(
      insertSQL,
      transcription,
      JSON.stringify({
        ...metadata,
        type: 'audio',
        audioUrl: uploadthingUrl,
      }),
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

    return NextResponse.json({
      id: entry.id,
      transcription,
      audioUrl: uploadthingUrl,
      message: 'Audio entry created successfully',
    })
  } catch (error) {
    console.error('Error creating processed audio entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
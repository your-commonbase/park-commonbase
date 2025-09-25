import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/openai'
import { validateApiKey } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || !validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const body = await request.json()
    const { data, metadata, collection = 'default', parentId } = body

    if (!data) {
      return NextResponse.json({ error: 'Data is required' }, { status: 400 })
    }

    // Generate embedding for the text
    const embedding = await generateEmbedding(data)

    // Create entry using raw SQL for vector insertion
    const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
    const insertSQL = `
      INSERT INTO ${tableName} (id, data, metadata, embedding, collection, parent_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2::jsonb, $3::vector, $4, $5, NOW(), NOW())
      RETURNING id, created_at, updated_at
    `

    const result = await prisma.$queryRawUnsafe(
      insertSQL,
      data,
      JSON.stringify(metadata || {}),
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
      const parentQuery = `SELECT metadata FROM ${tableName} WHERE id = $1`
      const parentResult = await prisma.$queryRawUnsafe(parentQuery, parentId) as any[]

      if (parentResult.length > 0) {
        const parentMetadata = parentResult[0].metadata || {}
        const commentIds = parentMetadata.comment_ids || []
        commentIds.push(entry.id)

        const updateParentSQL = `
          UPDATE ${tableName}
          SET metadata = $1::jsonb, updated_at = NOW()
          WHERE id = $2
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
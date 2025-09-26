import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { captionImage, generateEmbedding } from '@/lib/openai'
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

    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}
    const collection = (formData.get('collection') as string) || 'default'
    const parentId = formData.get('parentId') as string
    const uploadthingUrl = formData.get('uploadthingUrl') as string

    if (!imageFile && !uploadthingUrl) {
      return NextResponse.json({ error: 'Image file or UploadThing URL is required' }, { status: 400 })
    }

    let buffer: Buffer
    let imageUrl: string
    let fileName: string | undefined

    if (uploadthingUrl) {
      // Use UploadThing URL directly
      imageUrl = uploadthingUrl
      // Fetch the image for AI processing
      const response = await fetch(uploadthingUrl)
      buffer = Buffer.from(await response.arrayBuffer())
      fileName = undefined // No local file when using UploadThing
    } else {
      // Fallback for direct file upload (legacy)
      const { saveImageFile } = await import('@/lib/storage')
      buffer = Buffer.from(await imageFile.arrayBuffer())
      fileName = await saveImageFile(buffer, imageFile.name)
      imageUrl = `/images/${fileName}` // Local URL
    }

    // Generate caption for the image
    const caption = await captionImage(buffer)

    // Generate embedding for the caption
    const embedding = await generateEmbedding(caption)

    // Create entry with image metadata using raw SQL for vector insertion
    const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
    const insertSQL = `
      INSERT INTO ${tableName} (id, data, metadata, embedding, collection, parent_id, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2::jsonb, $3::vector, $4, $5, NOW(), NOW())
      RETURNING id, created_at, updated_at
    `

    const result = await prisma.$queryRawUnsafe(
      insertSQL,
      caption,
      JSON.stringify({
        ...metadata,
        type: 'image',
        imageUrl: imageUrl,
        imageFile: fileName, // Keep for backward compatibility
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

    return NextResponse.json({
      id: entry.id,
      caption,
      imageUrl: imageUrl,
      imageFile: fileName,
      message: 'Image entry created successfully',
    })
  } catch (error) {
    console.error('Error creating image entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
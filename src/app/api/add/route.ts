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

    // Create entry
    const entry = await prisma.entry.create({
      data: {
        data,
        metadata: metadata || {},
        embedding: JSON.stringify(embedding),
        collection,
        parentId: parentId || null,
      },
    })

    // If this is a comment, update the parent's comment_ids
    if (parentId) {
      const parent = await prisma.entry.findUnique({
        where: { id: parentId },
      })

      if (parent) {
        const parentMetadata = parent.metadata as any
        const commentIds = parentMetadata.comment_ids || []
        commentIds.push(entry.id)

        await prisma.entry.update({
          where: { id: parentId },
          data: {
            metadata: {
              ...parentMetadata,
              comment_ids: commentIds,
            },
          },
        })
      }
    }

    return NextResponse.json({ id: entry.id, message: 'Entry created successfully' })
  } catch (error) {
    console.error('Error creating entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
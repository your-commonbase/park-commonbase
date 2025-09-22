import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateApiKey } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params

    // Get all entries for the collection
    const entries = await prisma.entry.findMany({
      where: {
        collection: collection,
      },
      include: {
        comments: {
          include: {
            comments: true, // Include nested comments
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform entries for UMAP visualization
    const umapData = entries.map((entry) => ({
      id: entry.id,
      data: entry.data,
      metadata: entry.metadata,
      embedding: JSON.parse(entry.embedding),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      collection: entry.collection,
      parentId: entry.parentId,
      comments: entry.comments,
    }))

    return NextResponse.json(umapData)
  } catch (error) {
    console.error('Error fetching collection data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
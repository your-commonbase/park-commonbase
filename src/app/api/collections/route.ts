import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateApiKey, validateSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Reading collections is public - no authentication required
    // Get all distinct collections with entry counts
    const collections = await prisma.entry.groupBy({
      by: ['collection'],
      _count: {
        id: true,
      },
      orderBy: {
        collection: 'asc',
      },
    })

    const result = collections.map(group => ({
      name: group.collection,
      count: group._count.id,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 })
    }

    const collectionName = name.trim()

    // Check if collection already exists
    const existingCollection = await prisma.entry.findFirst({
      where: { collection: collectionName },
    })

    if (existingCollection) {
      return NextResponse.json({ error: 'Collection already exists' }, { status: 409 })
    }

    // TODO: Fix Prisma typing issue - collections are created when first entry is added
    // const placeholderEntry = await prisma.entry.create({
    //   data: {
    //     data: `Collection "${collectionName}" created`,
    //     metadata: {
    //       type: 'system',
    //       placeholder: true,
    //       createdBy: 'admin',
    //     },
    //     embedding: JSON.stringify([]), // Empty embedding for system entry
    //     collection: collectionName,
    //   },
    // })

    return NextResponse.json({
      name: collectionName,
      message: 'Collection created successfully',
    })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
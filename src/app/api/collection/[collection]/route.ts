import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateApiKey } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params

    // Since Prisma doesn't handle vector types well, use raw SQL to get entries with embeddings
    const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
    const entriesQuery = `
      SELECT
        e1.id,
        e1.data,
        e1.metadata,
        e1.embedding::text as embedding,
        e1.created_at,
        e1.updated_at,
        e1.collection,
        e1.parent_id,
        COALESCE(
          json_agg(
            CASE WHEN e2.id IS NOT NULL THEN
              json_build_object(
                'id', e2.id,
                'data', e2.data,
                'metadata', e2.metadata,
                'embedding', e2.embedding::text,
                'createdAt', e2.created_at,
                'updatedAt', e2.updated_at,
                'collection', e2.collection,
                'parentId', e2.parent_id
              )
            END
          ) FILTER (WHERE e2.id IS NOT NULL),
          '[]'::json
        ) as comments
      FROM ${tableName} e1
      LEFT JOIN ${tableName} e2 ON e2.parent_id = e1.id
      WHERE e1.collection = $1
      GROUP BY e1.id, e1.data, e1.metadata, e1.embedding, e1.created_at, e1.updated_at, e1.collection, e1.parent_id
      ORDER BY e1.created_at DESC
    `

    const entries = await prisma.$queryRawUnsafe(entriesQuery, collection) as any[]

    // Transform entries for UMAP visualization
    const umapData = entries.map((entry) => ({
      id: entry.id,
      data: entry.data,
      metadata: entry.metadata,
      embedding: entry.embedding ? JSON.parse(entry.embedding) : [],
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
      collection: entry.collection,
      parentId: entry.parent_id,
      comments: entry.comments || [],
    }))

    return NextResponse.json(umapData)
  } catch (error) {
    console.error('Error fetching collection data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
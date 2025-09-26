import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Papa from 'papaparse'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collection = searchParams.get('collection')

    // Build where clause
    const where = collection ? { collection } : {}

    // Get all entries
    const entries = await prisma.entry.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform entries to CSV format
    const csvData = entries.map((entry) => ({
      id: entry.id,
      data: entry.data,
      metadata: JSON.stringify(entry.metadata),
      embedding: (entry as any).embedding,
      created_at: entry.createdAt.toISOString(),
      updated_at: entry.updatedAt.toISOString(),
      collection: entry.collection,
    }))

    const csv = Papa.unparse(csvData)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="entries${
          collection ? `_${collection}` : ''
        }.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
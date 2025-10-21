import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/openai'
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
    const { csvData, collection = 'default' } = body

    if (!csvData) {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 })
    }

    // Parse CSV data with proper handling of quoted fields
    function parseCSVLine(line: string): string[] {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      let i = 0

      while (i < line.length) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"'
            i += 2
          } else {
            // Toggle quote state
            inQuotes = !inQuotes
            i++
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          result.push(current.trim())
          current = ''
          i++
        } else {
          current += char
          i++
        }
      }

      // Add the last field
      result.push(current.trim())
      return result
    }

    const lines = csvData.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 })
    }

    // Parse header
    const header = parseCSVLine(lines[0]).map((col: string) => col.toLowerCase())
    const dataIndex = header.indexOf('data')
    const authorIndex = header.indexOf('author')

    if (dataIndex === -1) {
      return NextResponse.json({ error: 'CSV must have a "data" column' }, { status: 400 })
    }

    const results = []
    const errors = []

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i])

      if (row.length < header.length) {
        errors.push(`Row ${i + 1}: Not enough columns`)
        continue
      }

      const data = row[dataIndex]
      if (!data) {
        errors.push(`Row ${i + 1}: Empty data field`)
        continue
      }

      const authorName = authorIndex >= 0 ? row[authorIndex] : ''

      try {
        // Generate embedding for the text
        const embedding = await generateEmbedding(data)

        // Create entry using raw SQL for vector insertion
        const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
        const insertSQL = `
          INSERT INTO ${tableName} (id, data, metadata, embedding, collection, parent_id, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2::jsonb, $3::vector, $4, $5::uuid, NOW(), NOW())
          RETURNING id, created_at, updated_at
        `

        const result = await prisma.$queryRawUnsafe(
          insertSQL,
          data,
          JSON.stringify({
            type: 'text',
            author: authorName ? { name: authorName } : undefined,
            batchImport: true,
            importedAt: new Date().toISOString(),
          }),
          JSON.stringify(embedding),
          collection,
          null
        ) as any[]

        const entry = {
          id: result[0].id,
          createdAt: result[0].created_at,
          updatedAt: result[0].updated_at
        }

        results.push({
          id: entry.id,
          data: data.substring(0, 50) + (data.length > 50 ? '...' : ''),
          author: authorName || 'N/A'
        })
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error)
        errors.push(`Row ${i + 1}: Failed to process - ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: 'Batch upload completed',
      processed: results.length,
      errorCount: errors.length,
      results,
      errors: errors.slice(0, 10), // Limit errors to first 10
    })
  } catch (error) {
    console.error('Error in batch upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
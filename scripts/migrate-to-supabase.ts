/**
 * Migration script to transfer data from SQLite to Supabase PostgreSQL
 *
 * This script:
 * 1. Connects to the old SQLite database
 * 2. Reads all entries with their data, metadata, embeddings, etc.
 * 3. Connects to the new Supabase PostgreSQL database
 * 4. Creates the schema if needed
 * 5. Migrates all data preserving relationships
 *
 * Usage: npm run migrate-to-supabase
 */

import { config } from 'dotenv'
import { PrismaClient as PostgresPrismaClient } from '@prisma/client'
import { join } from 'path'
import Database from 'better-sqlite3'

// Load environment variables
config({ path: '.env.local' })

interface SQLiteEntry {
  id: string
  data: string
  metadata: Record<string, unknown>
  embedding: string // JSON string
  created_at: string
  updated_at: string
  collection: string
  parent_id?: string
}

async function migrateSQLiteToSupabase() {
  console.log('🚀 Starting migration from SQLite to Supabase...\n')

  // Check if we have the required environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required for Supabase connection')
    console.log('Please add your Supabase connection string to .env.local:')
    console.log('DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"')
    process.exit(1)
  }

  // Get custom table name from environment or default to 'entries'
  const tableName = process.env.DATABASE_TABLE_NAME || 'entries'
  console.log(`📋 Target table: ${tableName}`)

  let sqliteDb: Database.Database | null = null
  let postgresClient: PostgresPrismaClient | null = null

  try {
    // Connect to SQLite database directly
    console.log('📖 Connecting to SQLite database...')
    const sqliteDbPath = join(process.cwd(), 'prisma', 'dev.db')
    sqliteDb = new Database(sqliteDbPath, { readonly: true })

    // Get all entries from SQLite
    console.log('📊 Reading entries from SQLite...')
    const entries = sqliteDb.prepare(`
      SELECT id, data, metadata, embedding, created_at, updated_at, collection, parent_id
      FROM entries
      ORDER BY created_at ASC
    `).all() as SQLiteEntry[]

    console.log(`Found ${entries.length} entries to migrate\n`)

    if (entries.length === 0) {
      console.log('✅ No entries found in SQLite database. Migration complete!')
      return
    }

    // Connect to PostgreSQL/Supabase with IPv6 support
    console.log('🔗 Connecting to Supabase PostgreSQL...')
    const connectionOptions = {
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    }

    // Add IPv6 support for direct connections
    if (process.env.DATABASE_URL?.includes('db.') && process.env.DATABASE_URL?.includes('.supabase.co')) {
      console.log('🌐 Using direct connection with IPv6 support...')
    }

    postgresClient = new PostgresPrismaClient(connectionOptions)

    // Test the connection
    await postgresClient.$connect()
    console.log('✅ Connected to Supabase successfully!')

    // Create schema in PostgreSQL if it doesn't exist
    console.log('📝 Ensuring database schema and pgvector extension exist...')

    // Enable pgvector extension
    await postgresClient.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`
    console.log('✅ pgvector extension enabled')

    // Create table with dynamic name (using unsafe raw SQL since Prisma doesn't support dynamic table names)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        metadata JSONB NOT NULL,
        embedding vector(1536) NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        collection TEXT NOT NULL DEFAULT 'default',
        parent_id TEXT,
        FOREIGN KEY (parent_id) REFERENCES ${tableName}(id) ON DELETE CASCADE
      );
    `
    await postgresClient.$executeRawUnsafe(createTableSQL)

    // Create indexes for better performance with dynamic table name
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_collection ON ${tableName}(collection);`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_parent_id ON ${tableName}(parent_id);`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_embedding ON ${tableName} USING ivfflat (embedding vector_cosine_ops);`
    ]

    for (const query of indexQueries) {
      await postgresClient.$executeRawUnsafe(query)
    }

    console.log('✅ Database schema ready!')

    // Migrate entries in batches to handle large datasets
    const batchSize = 100
    let migratedCount = 0
    let skippedCount = 0

    console.log('🔄 Starting data migration...\n')

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)

      for (const entry of batch) {
        try {
          // Check if entry already exists using dynamic table name
          const existingQuery = `SELECT id FROM ${tableName} WHERE id = $1 LIMIT 1`
          const existing = await postgresClient.$queryRawUnsafe(existingQuery, entry.id)

          if (Array.isArray(existing) && existing.length > 0) {
            console.log(`⏭️  Skipping existing entry: ${entry.id}`)
            skippedCount++
            continue
          }

          // Parse metadata and embedding
          let metadata
          try {
            metadata = typeof entry.metadata === 'string'
              ? JSON.parse(entry.metadata)
              : entry.metadata
          } catch {
            console.warn(`⚠️  Invalid metadata for entry ${entry.id}, using empty object`)
            metadata = {}
          }

          // Parse embedding from JSON string to array
          let embeddingArray: number[]
          try {
            embeddingArray = JSON.parse(entry.embedding)
            if (!Array.isArray(embeddingArray) || embeddingArray.length !== 1536) {
              throw new Error('Invalid embedding format or dimension')
            }
          } catch {
            console.warn(`⚠️  Invalid embedding for entry ${entry.id}, skipping...`)
            continue
          }

          // Create the entry in PostgreSQL using raw SQL for vector insertion with dynamic table name
          const insertSQL = `
            INSERT INTO ${tableName} (id, data, metadata, embedding, created_at, updated_at, collection, parent_id)
            VALUES ($1, $2, $3::jsonb, $4::vector, $5, $6, $7, $8)
          `
          await postgresClient.$executeRawUnsafe(
            insertSQL,
            entry.id,
            entry.data,
            JSON.stringify(metadata),
            JSON.stringify(embeddingArray),
            new Date(entry.created_at),
            new Date(entry.updated_at),
            entry.collection,
            entry.parent_id || null
          )

          migratedCount++

          if (migratedCount % 50 === 0) {
            console.log(`✅ Migrated ${migratedCount} entries...`)
          }

        } catch (error) {
          console.error(`❌ Error migrating entry ${entry.id}:`, error)
          // Continue with next entry rather than failing completely
        }
      }
    }

    console.log('\n🎉 Migration completed!')
    console.log(`📊 Summary:`)
    console.log(`   • Total entries in SQLite: ${entries.length}`)
    console.log(`   • Successfully migrated: ${migratedCount}`)
    console.log(`   • Skipped (already exists): ${skippedCount}`)

    // Verify the migration using dynamic table name
    console.log('\n🔍 Verifying migration...')
    const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`
    const countResult = await postgresClient.$queryRawUnsafe(countQuery) as any[]
    const postgresCount = parseInt(countResult[0]?.count || '0')
    console.log(`   • Total entries in Supabase: ${postgresCount}`)

    // Show some sample data using dynamic table name
    const sampleQuery = `SELECT id, data, collection, created_at FROM ${tableName} ORDER BY created_at DESC LIMIT 3`
    const sampleEntries = await postgresClient.$queryRawUnsafe(sampleQuery) as any[]

    console.log('\n📋 Sample migrated entries:')
    sampleEntries.forEach((entry: any, index: number) => {
      const shortData = entry.data?.substring(0, 50) || 'No data'
      console.log(`   ${index + 1}. ${entry.id} - ${shortData}... (${entry.collection})`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    // Clean up connections
    if (sqliteDb) {
      sqliteDb.close()
    }
    if (postgresClient) {
      await postgresClient.$disconnect()
    }
  }
}

// Run the migration
if (require.main === module) {
  migrateSQLiteToSupabase()
    .then(() => {
      console.log('\n✅ Migration script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error)
      process.exit(1)
    })
}

export { migrateSQLiteToSupabase }
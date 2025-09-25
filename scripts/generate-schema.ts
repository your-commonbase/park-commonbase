/**
 * Dynamic Prisma schema generator
 *
 * This script generates a Prisma schema with a custom table name
 * based on the DATABASE_TABLE_NAME environment variable.
 */

import { config } from 'dotenv'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config({ path: '.env.local' })

function generatePrismaSchema() {
  const tableName = process.env.DATABASE_TABLE_NAME || 'entries'

  console.log(`🔧 Generating Prisma schema with table name: ${tableName}`)

  const schemaTemplate = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Entry {
  id         String                     @id @default(uuid())
  data       String
  metadata   Json
  embedding  Unsupported("vector(1536)")   // pgvector type for 1536-dimensional embeddings
  createdAt  DateTime                   @default(now()) @map("created_at")
  updatedAt  DateTime                   @updatedAt @map("updated_at")
  collection String                     @default("default")

  // Relations for comments
  parentId   String?  @map("parent_id")
  parent     Entry?   @relation("EntryComments", fields: [parentId], references: [id], onDelete: Cascade)
  comments   Entry[]  @relation("EntryComments")

  @@map("${tableName}")
}
`

  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')

  try {
    writeFileSync(schemaPath, schemaTemplate, 'utf8')
    console.log('✅ Prisma schema updated successfully!')
    console.log(`   Table mapping: Entry model -> ${tableName} table`)

    return true
  } catch (error) {
    console.error('❌ Failed to update Prisma schema:', error)
    return false
  }
}

if (require.main === module) {
  const success = generatePrismaSchema()
  if (success) {
    console.log('\n💡 Next steps:')
    console.log('1. Run: npx prisma generate')
    console.log('2. Run: npm run test-supabase')
    console.log('3. Run: npm run migrate-to-supabase')
  }
  process.exit(success ? 0 : 1)
}

export { generatePrismaSchema }
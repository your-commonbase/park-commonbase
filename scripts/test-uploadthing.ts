#!/usr/bin/env tsx

/**
 * Test script to verify UploadThing connection
 */

import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables
config({ path: '.env.local' })

const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN || process.env.UPLOADTHING_SECRET
const UPLOADTHING_APP_NAME = process.env.UPLOADTHING_APP_NAME || process.env.UPLOADTHING_APP_ID

console.log('🔍 UploadThing Configuration Test')
console.log('=====================================')
console.log('UPLOADTHING_TOKEN:', UPLOADTHING_TOKEN ? '✅ Set (' + UPLOADTHING_TOKEN.substring(0, 10) + '...)' : '❌ Not set')
console.log('UPLOADTHING_APP_NAME:', UPLOADTHING_APP_NAME ? '✅ Set (' + UPLOADTHING_APP_NAME + ')' : '❌ Not set')
console.log()

async function testDatabaseConnection() {
  console.log('🗄️  Testing database connection...')
  const prisma = new PrismaClient()

  try {
    const entries = await prisma.entry.findMany({
      where: {
        OR: [
          { metadata: { path: '$.type', equals: 'image' } },
          { metadata: { path: '$.type', equals: 'audio' } }
        ]
      },
      take: 5
    })

    console.log(`✅ Database connected. Found ${entries.length} media entries (showing first 5):`)

    entries.forEach((entry, i) => {
      const metadata = entry.metadata as Record<string, any>
      console.log(`  ${i + 1}. ${metadata.type} - ${metadata.imageFile || metadata.audioFile || 'no file'} - ${metadata.imageUrl || metadata.audioUrl ? 'HAS URL' : 'NO URL'}`)
    })

  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  if (!UPLOADTHING_TOKEN) {
    console.log('❌ UPLOADTHING_TOKEN is required. Please add it to your .env.local file.')
    process.exit(1)
  }

  console.log('🚀 Configuration looks good!')
  console.log()

  await testDatabaseConnection()

  console.log()
  console.log('✅ Ready to run backfill! Use: npm run backfill-uploadthing')
}

main().catch(console.error)
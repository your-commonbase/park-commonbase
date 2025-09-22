#!/usr/bin/env tsx

/**
 * Backfill script to migrate existing local image and audio files to UploadThing
 *
 * Usage: npm run backfill-uploadthing
 */

import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import fetch from 'node-fetch'

// Load environment variables
config({ path: '.env.local' })

// Environment variables mapping
const UPLOADTHING_TOKEN = process.env.UPLOADTHING_TOKEN || process.env.UPLOADTHING_SECRET
const UPLOADTHING_APP_NAME = process.env.UPLOADTHING_APP_NAME || process.env.UPLOADTHING_APP_ID

if (!UPLOADTHING_TOKEN) {
  console.error('❌ UPLOADTHING_TOKEN is required')
  process.exit(1)
}

const prisma = new PrismaClient()

interface UploadResponse {
  data: {
    url: string
    appUrl: string
    key: string
    name: string
    size: number
  }[]
}

async function uploadToUploadThing(file: Buffer, filename: string, contentType: string): Promise<string> {
  try {
    console.log(`  📤 Starting upload for ${filename} (${Math.round(file.length / 1024)}KB)`)

    // Use UploadThing Server SDK directly with proper credentials
    const { UTApi } = await import('uploadthing/server')

    const utapi = new UTApi({
      token: UPLOADTHING_TOKEN,
    })

    // Create a File-like object from the buffer
    const fileBlob = new File([file], filename, { type: contentType })

    const response = await utapi.uploadFiles([fileBlob])

    if (!response || !response[0] || response[0].error) {
      const error = response?.[0]?.error || 'Unknown error'
      throw new Error(`UploadThing upload error: ${error}`)
    }

    const fileUrl = response[0].data?.url
    if (!fileUrl) {
      throw new Error('No file URL returned from UploadThing')
    }

    console.log(`  ✅ Upload complete: ${fileUrl}`)
    return fileUrl

  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}

async function backfillImages() {
  console.log('🖼️  Starting image backfill...')

  const imagesDir = join(process.cwd(), 'public', 'images')

  try {
    const files = await readdir(imagesDir)
    console.log(`Found ${files.length} image files`)

    // Get all entries with local image files
    const entries = await prisma.entry.findMany({
      where: {
        metadata: {
          path: '$.type',
          equals: 'image'
        }
      }
    })

    const imagesToProcess = entries.filter(entry => {
      const metadata = entry.metadata as any
      return metadata.imageFile && !metadata.imageUrl
    })

    console.log(`Processing ${imagesToProcess.length} entries with local images`)

    for (const entry of imagesToProcess) {
      const metadata = entry.metadata as any
      const filename = metadata.imageFile
      const filePath = join(imagesDir, filename)

      try {
        const fileStats = await stat(filePath)
        if (!fileStats.isFile()) continue

        console.log(`📤 Uploading ${filename}...`)

        const fileBuffer = await readFile(filePath)
        const contentType = filename.endsWith('.png') ? 'image/png' :
                          filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
                          filename.endsWith('.gif') ? 'image/gif' :
                          filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg'

        const uploadthingUrl = await uploadToUploadThing(fileBuffer, filename, contentType)

        // Update database with UploadThing URL
        await prisma.entry.update({
          where: { id: entry.id },
          data: {
            metadata: {
              ...metadata,
              imageUrl: uploadthingUrl,
            }
          }
        })

        console.log(`✅ ${filename} -> ${uploadthingUrl}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Failed to process ${filename}:`, error)
        continue
      }
    }

    console.log('✅ Image backfill complete!')

  } catch (error) {
    console.error('Error during image backfill:', error)
  }
}

async function backfillAudio() {
  console.log('🎵 Starting audio backfill...')

  const audioDir = join(process.cwd(), 'public', 'audio')

  try {
    const files = await readdir(audioDir)
    console.log(`Found ${files.length} audio files`)

    // Get all entries with local audio files
    const entries = await prisma.entry.findMany({
      where: {
        metadata: {
          path: '$.type',
          equals: 'audio'
        }
      }
    })

    const audioToProcess = entries.filter(entry => {
      const metadata = entry.metadata as any
      return metadata.audioFile && !metadata.audioUrl
    })

    console.log(`Processing ${audioToProcess.length} entries with local audio`)

    for (const entry of audioToProcess) {
      const metadata = entry.metadata as any
      const filename = metadata.audioFile
      const filePath = join(audioDir, filename)

      try {
        const fileStats = await stat(filePath)
        if (!fileStats.isFile()) continue

        console.log(`📤 Uploading ${filename}...`)

        const fileBuffer = await readFile(filePath)
        const contentType = filename.endsWith('.mp3') ? 'audio/mpeg' :
                          filename.endsWith('.wav') ? 'audio/wav' :
                          filename.endsWith('.m4a') ? 'audio/mp4' :
                          filename.endsWith('.ogg') ? 'audio/ogg' :
                          filename.endsWith('.flac') ? 'audio/flac' : 'audio/mpeg'

        const uploadthingUrl = await uploadToUploadThing(fileBuffer, filename, contentType)

        // Update database with UploadThing URL
        await prisma.entry.update({
          where: { id: entry.id },
          data: {
            metadata: {
              ...metadata,
              audioUrl: uploadthingUrl,
            }
          }
        })

        console.log(`✅ ${filename} -> ${uploadthingUrl}`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ Failed to process ${filename}:`, error)
        continue
      }
    }

    console.log('✅ Audio backfill complete!')

  } catch (error) {
    console.error('Error during audio backfill:', error)
  }
}

async function main() {
  console.log('🚀 Starting UploadThing backfill process...')
  console.log('Using token:', UPLOADTHING_TOKEN?.substring(0, 10) + '...')
  console.log('App name:', UPLOADTHING_APP_NAME)
  console.log()

  try {
    await backfillImages()
    console.log()
    await backfillAudio()
    console.log()
    console.log('🎉 Backfill process complete!')
  } catch (error) {
    console.error('❌ Backfill failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main().catch(console.error)
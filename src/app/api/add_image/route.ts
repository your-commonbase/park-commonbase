import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { captionImage, generateEmbedding } from '@/lib/openai'
import { validateApiKey } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || !validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}
    const collection = (formData.get('collection') as string) || 'default'
    const parentId = formData.get('parentId') as string
    const uploadthingUrl = formData.get('uploadthingUrl') as string

    if (!imageFile && !uploadthingUrl) {
      return NextResponse.json({ error: 'Image file or UploadThing URL is required' }, { status: 400 })
    }

    let buffer: Buffer
    let imageUrl: string
    let fileName: string | undefined

    if (uploadthingUrl) {
      // Use UploadThing URL directly
      imageUrl = uploadthingUrl
      // Fetch the image for AI processing
      const response = await fetch(uploadthingUrl)
      buffer = Buffer.from(await response.arrayBuffer())
      fileName = undefined // No local file when using UploadThing
    } else {
      // Fallback for direct file upload (legacy)
      const { saveImageFile } = await import('@/lib/storage')
      buffer = Buffer.from(await imageFile.arrayBuffer())
      fileName = await saveImageFile(buffer, imageFile.name)
      imageUrl = `/images/${fileName}` // Local URL
    }

    // Generate caption for the image
    const caption = await captionImage(buffer)

    // Generate embedding for the caption
    const embedding = await generateEmbedding(caption)

    // Create entry with image metadata
    const entry = await prisma.entry.create({
      data: {
        data: caption,
        metadata: {
          ...metadata,
          type: 'image',
          imageUrl: imageUrl,
          imageFile: fileName, // Keep for backward compatibility
        },
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

    return NextResponse.json({
      id: entry.id,
      caption,
      imageUrl: imageUrl,
      imageFile: fileName,
      message: 'Image entry created successfully',
    })
  } catch (error) {
    console.error('Error creating image entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { transcribeAudio, generateEmbedding } from '@/lib/openai'
import { saveAudioFile } from '@/lib/storage'
import { validateApiKey } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || !validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const metadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : {}
    const collection = (formData.get('collection') as string) || 'default'
    const parentId = formData.get('parentId') as string

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer())

    // Save the audio file
    const fileName = await saveAudioFile(buffer, audioFile.name)

    // Transcribe the audio
    const transcription = await transcribeAudio(buffer, audioFile.name)

    // Generate embedding for the transcription
    const embedding = await generateEmbedding(transcription)

    // Create entry with audio metadata
    const entry = await prisma.entry.create({
      data: {
        data: transcription,
        metadata: {
          ...metadata,
          type: 'audio',
          audioFile: fileName,
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
      transcription,
      audioFile: fileName,
      message: 'Audio entry created successfully',
    })
  } catch (error) {
    console.error('Error creating audio entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
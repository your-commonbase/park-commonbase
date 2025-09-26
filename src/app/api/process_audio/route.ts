import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio, generateEmbedding } from '@/lib/openai'
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

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    // Process the audio file directly
    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const audioFileName = audioFile.name

    // Process with OpenAI in parallel - transcribe and generate embedding
    const [transcription, embedding] = await Promise.all([
      transcribeAudio(buffer, audioFileName),
      // We'll generate embedding after transcription for efficiency
      Promise.resolve(null)
    ])

    // Generate embedding from transcription
    const embeddingVector = await generateEmbedding(transcription)

    return NextResponse.json({
      transcription,
      embedding: embeddingVector,
      message: 'Audio processed successfully'
    })
  } catch (error) {
    console.error('Error processing audio:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
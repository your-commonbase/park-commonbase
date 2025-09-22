import OpenAI from 'openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function transcribeAudio(audioBuffer: Buffer, originalFileName?: string): Promise<string> {
  // Use original filename and detect MIME type based on extension
  const fileName = originalFileName || 'audio.mp3'
  const extension = fileName.split('.').pop()?.toLowerCase()

  let mimeType = 'audio/mp3'
  if (extension === 'm4a') mimeType = 'audio/m4a'
  else if (extension === 'wav') mimeType = 'audio/wav'
  else if (extension === 'flac') mimeType = 'audio/flac'
  else if (extension === 'ogg') mimeType = 'audio/ogg'

  const file = new File([audioBuffer.buffer], fileName, { type: mimeType })

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'gpt-4o-transcribe',
  })

  return transcription.text
}

export async function captionImage(imageBuffer: Buffer): Promise<string> {
  const base64Image = imageBuffer.toString('base64')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image in detail.' },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
  })

  return response.choices[0].message.content || ''
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })

  return response.data[0].embedding
}
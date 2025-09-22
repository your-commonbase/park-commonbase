import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function saveAudioFile(buffer: Buffer, originalName: string): Promise<string> {
  const fileId = uuidv4()
  const extension = path.extname(originalName) || '.mp3'
  const fileName = `${fileId}${extension}`
  const filePath = path.join(process.cwd(), 'public', 'audio', fileName)

  await fs.writeFile(filePath, buffer)
  return fileName
}

export async function saveImageFile(buffer: Buffer, originalName: string): Promise<string> {
  const fileId = uuidv4()
  const extension = path.extname(originalName) || '.jpg'
  const fileName = `${fileId}${extension}`
  const filePath = path.join(process.cwd(), 'public', 'images', fileName)

  await fs.writeFile(filePath, buffer)
  return fileName
}

export async function deleteFile(fileName: string, type: 'audio' | 'image'): Promise<void> {
  const filePath = path.join(process.cwd(), 'public', type === 'audio' ? 'audio' : 'images', fileName)

  try {
    await fs.unlink(filePath)
  } catch (error) {
    console.error(`Failed to delete file: ${fileName}`, error)
  }
}
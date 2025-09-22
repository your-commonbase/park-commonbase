import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateSession } from '@/lib/auth'
import { deleteFile } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value
    if (!sessionToken || !validateSession(sessionToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Find the entry first to get file information
    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        comments: true,
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const metadata = entry.metadata as any

    // Delete associated files
    if (metadata.type === 'audio' && metadata.audioFile) {
      await deleteFile(metadata.audioFile, 'audio')
    } else if (metadata.type === 'image' && metadata.imageFile) {
      await deleteFile(metadata.imageFile, 'image')
    }

    // If this entry has a parent, remove it from parent's comment_ids
    if (entry.parentId) {
      const parent = await prisma.entry.findUnique({
        where: { id: entry.parentId },
      })

      if (parent) {
        const parentMetadata = parent.metadata as any
        const commentIds = (parentMetadata.comment_ids || []).filter((commentId: string) => commentId !== id)

        await prisma.entry.update({
          where: { id: entry.parentId },
          data: {
            metadata: {
              ...parentMetadata,
              comment_ids: commentIds,
            },
          },
        })
      }
    }

    // Delete the entry (comments will be cascade deleted due to the schema)
    await prisma.entry.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
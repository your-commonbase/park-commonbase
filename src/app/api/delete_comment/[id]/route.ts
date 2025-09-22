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

    // Find the comment first
    const comment = await prisma.entry.findUnique({
      where: { id },
    })

    if (!comment || !comment.parentId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const metadata = comment.metadata as any

    // Delete associated files if any
    if (metadata.type === 'audio' && metadata.audioFile) {
      await deleteFile(metadata.audioFile, 'audio')
    } else if (metadata.type === 'image' && metadata.imageFile) {
      await deleteFile(metadata.imageFile, 'image')
    }

    // Remove comment from parent's comment_ids
    const parent = await prisma.entry.findUnique({
      where: { id: comment.parentId },
    })

    if (parent) {
      const parentMetadata = parent.metadata as any
      const commentIds = (parentMetadata.comment_ids || []).filter((commentId: string) => commentId !== id)

      await prisma.entry.update({
        where: { id: comment.parentId },
        data: {
          metadata: {
            ...parentMetadata,
            comment_ids: commentIds,
          },
        },
      })
    }

    // Delete the comment
    await prisma.entry.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
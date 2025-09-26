import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateSession, validateApiKey } from '@/lib/auth'
import { deleteFile } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check for API key first (like add route)
    const apiKey = request.headers.get('x-api-key')
    if (apiKey && validateApiKey(apiKey)) {
      // API key is valid, proceed with deletion
    } else {
      // Fall back to session-based auth for admin UI
      const sessionToken = request.cookies.get('admin_session')?.value
      console.log('Delete comment request - Session token:', sessionToken ? 'exists' : 'missing')

      if (!sessionToken || !validateSession(sessionToken)) {
        console.log('Delete comment auth failed - token valid:', sessionToken ? validateSession(sessionToken) : 'no token')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { id } = await params
    const tableName = process.env.DATABASE_TABLE_NAME || 'entries'

    // Find the comment first
    const commentQuery = `SELECT id, metadata, parent_id FROM ${tableName} WHERE id = $1`
    const commentResult = await prisma.$queryRawUnsafe(commentQuery, id) as any[]

    if (commentResult.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const comment = commentResult[0]
    if (!comment.parent_id) {
      return NextResponse.json({ error: 'Entry is not a comment' }, { status: 400 })
    }

    const metadata = comment.metadata || {}

    // Delete associated files if any
    if (metadata.type === 'audio' && metadata.audioFile) {
      try {
        await deleteFile(metadata.audioFile, 'audio')
      } catch (error) {
        console.warn('Failed to delete audio file:', metadata.audioFile)
      }
    } else if (metadata.type === 'image' && metadata.imageFile) {
      try {
        await deleteFile(metadata.imageFile, 'image')
      } catch (error) {
        console.warn('Failed to delete image file:', metadata.imageFile)
      }
    }

    // Remove comment from parent's comment_ids
    const parentQuery = `SELECT metadata FROM ${tableName} WHERE id = $1`
    const parentResult = await prisma.$queryRawUnsafe(parentQuery, comment.parent_id) as any[]

    if (parentResult.length > 0) {
      const parentMetadata = parentResult[0].metadata || {}
      const commentIds = (parentMetadata.comment_ids || []).filter((commentId: string) => commentId !== id)

      const updateParentSQL = `
        UPDATE ${tableName}
        SET metadata = $1::jsonb, updated_at = NOW()
        WHERE id = $2
      `
      await prisma.$queryRawUnsafe(
        updateParentSQL,
        JSON.stringify({
          ...parentMetadata,
          comment_ids: commentIds,
        }),
        comment.parent_id
      )
    }

    // Delete the comment
    const deleteSQL = `DELETE FROM ${tableName} WHERE id = $1`
    await prisma.$queryRawUnsafe(deleteSQL, id)

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
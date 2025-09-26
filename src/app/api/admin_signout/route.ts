import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value

    if (sessionToken) {
      destroySession(sessionToken)
    }

    const response = NextResponse.json({ message: 'Signed out successfully' })
    response.cookies.delete('admin_session')

    return response
  } catch (error) {
    console.error('Error signing out admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value

    if (!sessionToken || !validateSession(sessionToken)) {
      return NextResponse.json({ isAdmin: false })
    }

    return NextResponse.json({ isAdmin: true })
  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json({ isAdmin: false })
  }
}
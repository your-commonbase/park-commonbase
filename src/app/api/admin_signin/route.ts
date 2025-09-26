import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin, generateSessionToken, createSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const isValid = await validateAdmin(username, password)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const sessionToken = generateSessionToken()
    createSession(sessionToken)

    const response = NextResponse.json({ message: 'Signed in successfully' })
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better mobile compatibility
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/', // Explicitly set path
    })

    return response
  } catch (error) {
    console.error('Error signing in admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
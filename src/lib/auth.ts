import bcrypt from 'bcryptjs'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password'

export function validateApiKey(apiKey: string): boolean {
  return apiKey === process.env.API_KEY
}

export async function validateAdmin(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME) return false

  // If ADMIN_PASSWORD is already hashed, compare directly
  // Otherwise, hash the plain text password first
  if (ADMIN_PASSWORD.startsWith('$2')) {
    return bcrypt.compare(password, ADMIN_PASSWORD)
  } else {
    return password === ADMIN_PASSWORD
  }
}

import crypto from 'crypto'

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production'

export function generateSessionToken(): string {
  // Create a JWT-like token with timestamp and signature
  const payload = {
    iat: Math.floor(Date.now() / 1000), // issued at (timestamp)
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // expires in 24 hours
    admin: true
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadBase64)
    .digest('base64url')

  return `${payloadBase64}.${signature}`
}

export function createSession(token: string): void {
  // No longer needed - JWT tokens are self-contained
}

export function validateSession(token: string): boolean {
  try {
    const [payloadBase64, signature] = token.split('.')
    if (!payloadBase64 || !signature) return false

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadBase64)
      .digest('base64url')

    if (signature !== expectedSignature) return false

    // Check expiration
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString())
    const now = Math.floor(Date.now() / 1000)

    if (payload.exp < now) return false
    if (!payload.admin) return false

    return true
  } catch (error) {
    return false
  }
}

export function destroySession(token: string): void {
  // JWT tokens can't be invalidated server-side without a blacklist
  // The cookie will be deleted client-side which is sufficient
}
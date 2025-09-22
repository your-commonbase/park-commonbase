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

export function generateSessionToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Simple in-memory session store (use Redis in production)
const activeSessions = new Set<string>()

export function createSession(token: string): void {
  activeSessions.add(token)
}

export function validateSession(token: string): boolean {
  return activeSessions.has(token)
}

export function destroySession(token: string): void {
  activeSessions.delete(token)
}
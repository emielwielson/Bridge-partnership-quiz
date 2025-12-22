import { cookies } from 'next/headers'
import { db } from '../db'

const SESSION_COOKIE_NAME = 'session_id'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

/**
 * Create a new session for a user
 * @param userId - User ID to create session for
 * @returns Session ID
 */
export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)
  
  // Create session in database
  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
    },
  })

  // Store session ID in cookie
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return session.id
}

/**
 * Validate a session and return the user ID
 * @param sessionId - Session ID to validate
 * @returns User ID if session is valid, null otherwise
 */
export async function validateSession(sessionId: string | undefined): Promise<string | null> {
  if (!sessionId) {
    return null
  }

  // Find session in database
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  // Check if session exists and is not expired
  if (!session || session.expiresAt < new Date()) {
    // Clean up expired session
    if (session) {
      await db.session.delete({ where: { id: sessionId } })
    }
    return null
  }

  return session.userId
}

/**
 * Get the current session ID from cookies
 * @returns Session ID or undefined
 */
export async function getSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value
}

/**
 * Destroy a session
 * @param sessionId - Session ID to destroy
 */
export async function destroySession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) {
    return
  }

  // Delete session from database
  await db.session.deleteMany({
    where: { id: sessionId },
  })

  // Delete cookie
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Clean up expired sessions (can be run as a cron job)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  await db.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })
}


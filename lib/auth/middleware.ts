import { NextRequest, NextResponse } from 'next/server'
import { getSessionId, validateSession } from './session'
import { db } from '../db'

/**
 * Require authentication for a route
 * Returns the authenticated user or throws an error response
 * @param request - Next.js request object
 * @returns User object if authenticated
 * @throws NextResponse with 401 status if not authenticated
 */
export async function requireAuth(request: NextRequest) {
  const sessionId = await getSessionId()
  const userId = await validateSession(sessionId)

  if (!userId) {
    throw NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      inviteCode: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw NextResponse.json(
      { error: 'User not found' },
      { status: 401 }
    )
  }

  return user
}

/**
 * Optional authentication for a route
 * Returns the user if authenticated, null otherwise
 * @param request - Next.js request object
 * @returns User object if authenticated, null otherwise
 */
export async function optionalAuth(request: NextRequest) {
  try {
    const sessionId = await getSessionId()
    const userId = await validateSession(sessionId)

    if (!userId) {
      return null
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        inviteCode: true,
        createdAt: true,
      },
    })

    return user
  } catch {
    return null
  }
}


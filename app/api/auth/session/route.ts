import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getSessionId, validateSession } from '@/lib/auth/session'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionId()
    const userId = await validateSession(sessionId)

    if (!userId) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        inviteCode: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        authenticated: true,
        user,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getSessionId, destroySession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId()
    await destroySession(sessionId)

    return NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


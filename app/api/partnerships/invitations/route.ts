import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { getPendingInvitationsForUser } from '@/lib/partnership-invitation'

export async function GET(request: NextRequest) {
export const dynamic = 'force-dynamic'

  try {
    const user = await requireAuth(request)

    const invitations = await getPendingInvitationsForUser(user.id)

    return NextResponse.json(
      {
        invitations,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


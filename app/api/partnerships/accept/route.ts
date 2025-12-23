import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth/middleware'
export const dynamic = 'force-dynamic'
import { acceptPartnershipInvitation } from '@/lib/partnership-invitation'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    const partnership = await acceptPartnershipInvitation(invitationId, user.id)

    return NextResponse.json(
      {
        message: 'Invitation accepted successfully',
        partnership,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Accept invitation error:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


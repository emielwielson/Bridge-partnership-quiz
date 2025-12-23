import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { rejectPartnershipInvitation } from '@/lib/partnership-invitation'

export async function POST(request: NextRequest) {
export const dynamic = 'force-dynamic'

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

    await rejectPartnershipInvitation(invitationId, user.id)

    return NextResponse.json(
      {
        message: 'Invitation rejected successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Reject invitation error:', error)
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


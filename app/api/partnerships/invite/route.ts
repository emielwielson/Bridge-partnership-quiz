import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth/middleware'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
import { createPartnershipInvitation } from '@/lib/partnership-invitation'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { partnershipId, inviteCode } = body

    if (!partnershipId || !inviteCode) {
      return NextResponse.json(
        { error: 'Partnership ID and invite code are required' },
        { status: 400 }
      )
    }

    // Validate user is member of partnership
    const membership = await db.partnershipMember.findUnique({
      where: {
        partnershipId_userId: {
          partnershipId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this partnership' },
        { status: 403 }
      )
    }

    // Find user by invite code
    const invitee = await db.user.findUnique({
      where: { inviteCode },
    })

    if (!invitee) {
      return NextResponse.json(
        { error: 'User with this invite code not found' },
        { status: 404 }
      )
    }

    if (invitee.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot invite yourself' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingMember = await db.partnershipMember.findUnique({
      where: {
        partnershipId_userId: {
          partnershipId,
          userId: invitee.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this partnership' },
        { status: 400 }
      )
    }

    // Create invitation
    const invitation = await createPartnershipInvitation(
      partnershipId,
      user.id,
      invitee.id
    )

    return NextResponse.json(
      {
        message: 'Invitation sent successfully',
        invitation,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Invite partner error:', error)
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


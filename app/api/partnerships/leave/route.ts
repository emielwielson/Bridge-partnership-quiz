import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth/middleware'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
import { destroyPartnership } from '@/lib/partnership-cleanup'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { partnershipId } = body

    if (!partnershipId) {
      return NextResponse.json(
        { error: 'Partnership ID is required' },
        { status: 400 }
      )
    }

    // Validate user is member
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

    // Remove user from partnership and destroy it (since we can't add more members)
    await db.partnershipMember.delete({
      where: {
        partnershipId_userId: {
          partnershipId,
          userId: user.id,
        },
      },
    })

    // Always destroy partnership when someone leaves (since we can't add more members)
    await destroyPartnership(partnershipId)

    return NextResponse.json(
      {
        message: 'Partnership left and destroyed',
        partnershipDestroyed: true,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Leave partnership error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


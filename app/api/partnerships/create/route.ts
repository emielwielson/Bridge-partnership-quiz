import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
export const dynamic = 'force-dynamic'

  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { inviteCodes } = body

    if (!inviteCodes || !Array.isArray(inviteCodes) || inviteCodes.length === 0) {
      return NextResponse.json(
        { error: 'At least one partner invite code is required' },
        { status: 400 }
      )
    }

    // Find all users by invite codes
    const partners = await db.user.findMany({
      where: {
        inviteCode: {
          in: inviteCodes,
        },
      },
      select: {
        id: true,
        username: true,
        inviteCode: true,
      },
    })

    // Check if all invite codes were found
    if (partners.length !== inviteCodes.length) {
      const foundCodes = partners.map(p => p.inviteCode)
      const missingCodes = inviteCodes.filter(code => !foundCodes.includes(code))
      return NextResponse.json(
        { error: `Invalid invite codes: ${missingCodes.join(', ')}` },
        { status: 404 }
      )
    }

    // Check if user is trying to invite themselves
    const selfInvite = partners.find(p => p.id === user.id)
    if (selfInvite) {
      return NextResponse.json(
        { error: 'You cannot invite yourself' },
        { status: 400 }
      )
    }

    // Check for duplicate partners
    const uniquePartnerIds = new Set(partners.map(p => p.id))
    if (uniquePartnerIds.size !== partners.length) {
      return NextResponse.json(
        { error: 'Duplicate invite codes provided' },
        { status: 400 }
      )
    }

    // Create partnership and add all members in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create partnership
      const partnership = await tx.partnership.create({
        data: {},
      })

      // Add creator as first member
      await tx.partnershipMember.create({
        data: {
          partnershipId: partnership.id,
          userId: user.id,
        },
      })

      // Add all partners
      for (const partner of partners) {
        await tx.partnershipMember.create({
          data: {
            partnershipId: partnership.id,
            userId: partner.id,
          },
        })
      }

      // Return partnership with all members
      return await tx.partnership.findUnique({
        where: { id: partnership.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
            orderBy: {
              joinedAt: 'asc',
            },
          },
        },
      })
    })

    return NextResponse.json(
      {
        message: 'Partnership created successfully',
        partnership: result,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create partnership error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


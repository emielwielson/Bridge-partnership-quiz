import { db } from './db'
import { PartnershipInvitationStatus } from '@prisma/client'

/**
 * Create a partnership invitation
 * @param partnershipId - ID of the partnership
 * @param inviterId - ID of the user sending the invitation
 * @param inviteeId - ID of the user being invited
 * @returns Created invitation
 */
export async function createPartnershipInvitation(
  partnershipId: string,
  inviterId: string,
  inviteeId: string
) {
  // Check if invitation already exists
  const existing = await db.partnershipInvitation.findUnique({
    where: {
      partnershipId_inviteeId: {
        partnershipId,
        inviteeId,
      },
    },
  })

  if (existing && existing.status === PartnershipInvitationStatus.PENDING) {
    throw new Error('Invitation already exists and is pending')
  }

  // Create new invitation
  return await db.partnershipInvitation.create({
    data: {
      partnershipId,
      inviterId,
      inviteeId,
      status: PartnershipInvitationStatus.PENDING,
    },
    include: {
      partnership: {
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
          },
        },
      },
      inviter: {
        select: {
          id: true,
          username: true,
        },
      },
      invitee: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  })
}

/**
 * Accept a partnership invitation
 * @param invitationId - ID of the invitation
 * @param userId - ID of the user accepting (must be the invitee)
 * @returns Partnership with updated members
 */
export async function acceptPartnershipInvitation(
  invitationId: string,
  userId: string
) {
  // Find invitation
  const invitation = await db.partnershipInvitation.findUnique({
    where: { id: invitationId },
    include: {
      partnership: true,
    },
  })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.inviteeId !== userId) {
    throw new Error('User is not the invitee of this invitation')
  }

  if (invitation.status !== PartnershipInvitationStatus.PENDING) {
    throw new Error('Invitation is not pending')
  }

  // Check if user is already a member
  const existingMember = await db.partnershipMember.findUnique({
    where: {
      partnershipId_userId: {
        partnershipId: invitation.partnershipId,
        userId,
      },
    },
  })

  if (existingMember) {
    // User is already a member, just update invitation status
    await db.partnershipInvitation.update({
      where: { id: invitationId },
      data: { status: PartnershipInvitationStatus.ACCEPTED },
    })
    return await db.partnership.findUnique({
      where: { id: invitation.partnershipId },
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
        },
      },
    })
  }

  // Add user to partnership and update invitation status in a transaction
  const result = await db.$transaction(async (tx) => {
    // Create partnership member
    await tx.partnershipMember.create({
      data: {
        partnershipId: invitation.partnershipId,
        userId,
      },
    })

    // Update invitation status
    await tx.partnershipInvitation.update({
      where: { id: invitationId },
      data: { status: PartnershipInvitationStatus.ACCEPTED },
    })

    // Return partnership with members
    return await tx.partnership.findUnique({
      where: { id: invitation.partnershipId },
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
        },
      },
    })
  })

  return result
}

/**
 * Reject a partnership invitation
 * @param invitationId - ID of the invitation
 * @param userId - ID of the user rejecting (must be the invitee)
 */
export async function rejectPartnershipInvitation(
  invitationId: string,
  userId: string
) {
  const invitation = await db.partnershipInvitation.findUnique({
    where: { id: invitationId },
  })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.inviteeId !== userId) {
    throw new Error('User is not the invitee of this invitation')
  }

  if (invitation.status !== PartnershipInvitationStatus.PENDING) {
    throw new Error('Invitation is not pending')
  }

  await db.partnershipInvitation.update({
    where: { id: invitationId },
    data: { status: PartnershipInvitationStatus.REJECTED },
  })
}

/**
 * Get all pending invitations for a user
 * @param userId - ID of the user
 * @returns Array of pending invitations (both sent and received)
 */
export async function getPendingInvitationsForUser(userId: string) {
  return await db.partnershipInvitation.findMany({
    where: {
      OR: [
        { inviterId: userId },
        { inviteeId: userId },
      ],
      status: PartnershipInvitationStatus.PENDING,
    },
    include: {
      partnership: {
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
          },
        },
      },
      inviter: {
        select: {
          id: true,
          username: true,
        },
      },
      invitee: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}


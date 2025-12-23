import { db } from './db'
import { AttemptStatus } from '@prisma/client'

/**
 * Destroy a partnership and clean up related data
 * - Deletes all incomplete attempts (IN_PROGRESS)
 * - Retains all completed attempts (COMPLETED)
 * - Deletes partnership and all memberships
 * - Deletes all pending invitations for the partnership
 * @param partnershipId - ID of the partnership to destroy
 */
export async function destroyPartnership(partnershipId: string) {
  await db.$transaction(async (tx) => {
    // Delete all incomplete attempts
    await tx.attempt.deleteMany({
      where: {
        partnershipId,
        status: AttemptStatus.IN_PROGRESS,
      },
    })

    // Note: Completed attempts are retained (not deleted)
    // They will remain in the database with the partnershipId reference
    // even though the partnership no longer exists

    // Delete all pending invitations for this partnership
    await tx.partnershipInvitation.deleteMany({
      where: {
        partnershipId,
        status: 'PENDING',
      },
    })

    // Delete all partnership members
    await tx.partnershipMember.deleteMany({
      where: {
        partnershipId,
      },
    })

    // Delete the partnership itself
    await tx.partnership.delete({
      where: {
        id: partnershipId,
      },
    })
  })
}


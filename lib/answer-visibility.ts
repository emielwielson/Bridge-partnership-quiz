import { db } from './db'

export interface VisibilityResult {
  visible: boolean
  reason?: string
  answeredBy: string[] // User IDs who have answered
  totalMembers: number
}

/**
 * Check if answers are visible for a question in a partnership attempt
 * Rules:
 * - Answers are hidden until ALL partnership members have answered the question
 * - Once all members have answered, answers become immediately visible to all members
 * - For class attempts, answers are always visible (individual mode)
 */
export async function checkAnswerVisibility(
  questionId: string,
  attemptId: string
): Promise<VisibilityResult> {
  // Get the attempt to check if it's partnership or class
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    select: {
      partnershipId: true,
      classId: true,
    },
  })

  if (!attempt) {
    return {
      visible: false,
      reason: 'Attempt not found',
      answeredBy: [],
      totalMembers: 0,
    }
  }

  // Class attempts: answers are always visible (individual mode)
  if (attempt.classId) {
    return {
      visible: true,
      reason: 'Class mode - answers always visible',
      answeredBy: [],
      totalMembers: 0,
    }
  }

  // Partnership attempts: check if all members have answered
  if (!attempt.partnershipId) {
    return {
      visible: false,
      reason: 'Attempt has no partnership or class',
      answeredBy: [],
      totalMembers: 0,
    }
  }

  // Get all partnership members
  const partnership = await db.partnership.findUnique({
    where: { id: attempt.partnershipId },
    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  })

  if (!partnership) {
    return {
      visible: false,
      reason: 'Partnership not found',
      answeredBy: [],
      totalMembers: 0,
    }
  }

  const memberIds = partnership.members.map((m) => m.userId)
  const totalMembers = memberIds.length

  // Get all answers for this question in this attempt
  const answers = await db.answer.findMany({
    where: {
      questionId,
      attemptId,
      userId: {
        in: memberIds,
      },
    },
    select: {
      userId: true,
    },
  })

  const answeredBy = answers.map((a) => a.userId)
  const allAnswered = memberIds.every((memberId) => answeredBy.includes(memberId))

  return {
    visible: allAnswered,
    reason: allAnswered
      ? 'All partnership members have answered'
      : `Waiting for ${totalMembers - answeredBy.length} more member(s) to answer`,
    answeredBy,
    totalMembers,
  }
}

/**
 * Check if an answer can be edited
 * Rules:
 * - Answers can be edited until all partnership members have answered
 * - Once all members have answered, answers become read-only
 * - For class attempts, answers can always be edited (until attempt is completed)
 */
export async function checkAnswerEditability(
  questionId: string,
  attemptId: string,
  userId: string
): Promise<{ editable: boolean; reason?: string }> {
  // Check if attempt is completed and get attempt type
  const attempt = await db.attempt.findUnique({
    where: { id: attemptId },
    select: {
      status: true,
      userId: true,
      classId: true,
      partnershipId: true,
    },
  })

  if (!attempt) {
    return {
      editable: false,
      reason: 'Attempt not found',
    }
  }

  // For class attempts, answers can always be edited until attempt is completed
  if (attempt.classId) {
    if (attempt.status === 'COMPLETED') {
      return {
        editable: false,
        reason: 'Answer cannot be edited because the attempt is completed',
      }
    }
    // Only the user who created the attempt can edit their own answers
    if (attempt.userId !== userId) {
      return {
        editable: false,
        reason: 'You can only edit your own answers',
      }
    }
    return {
      editable: true,
    }
  }

  // For partnership attempts, check visibility
  const visibility = await checkAnswerVisibility(questionId, attemptId)

  // If answers are visible (all answered), they can't be edited
  if (visibility.visible) {
    return {
      editable: false,
      reason: 'Answer cannot be edited because all partnership members have already answered',
    }
  }

  if (!attempt) {
    return {
      editable: false,
      reason: 'Attempt not found',
    }
  }

  // Only the user who created the attempt can edit their own answers
  if (attempt.userId !== userId) {
    return {
      editable: false,
      reason: 'You can only edit your own answers',
    }
  }

  // If attempt is completed, answers can't be edited
  if (attempt.status === 'COMPLETED') {
    return {
      editable: false,
      reason: 'Answer cannot be edited because the attempt is completed',
    }
  }

  return {
    editable: true,
  }
}


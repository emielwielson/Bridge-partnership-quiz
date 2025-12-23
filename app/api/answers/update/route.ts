import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { AnswerType, AttemptStatus } from '@prisma/client'
import { checkAnswerEditability } from '@/lib/answer-visibility'

/**
 * Validate answer data structure based on answer type
 */
export const dynamic = 'force-dynamic'

function validateAnswerData(answerType: AnswerType, answerData: any): {
  valid: boolean
  error?: string
} {
  if (!answerData || typeof answerData !== 'object') {
    return {
      valid: false,
      error: 'Answer data must be an object',
    }
  }

  switch (answerType) {
    case AnswerType.FORCING_NON_FORCING:
      if (!answerData.type || (answerData.type !== 'FORCING' && answerData.type !== 'NON_FORCING')) {
        return {
          valid: false,
          error: 'Forcing/Non-forcing answer must have type: "FORCING" or "NON_FORCING"',
        }
      }
      return { valid: true }

    case AnswerType.DOUBLE_INTERPRETATION:
      if (!answerData.option || typeof answerData.option !== 'string') {
        return {
          valid: false,
          error: 'Double interpretation answer must have option as a string',
        }
      }
      return { valid: true }

    case AnswerType.REDOUBLE_INTERPRETATION:
      if (!answerData.option || typeof answerData.option !== 'string') {
        return {
          valid: false,
          error: 'Redouble interpretation answer must have option as a string',
        }
      }
      return { valid: true }

    case AnswerType.FREE_ANSWER:
      if (!answerData.intent || typeof answerData.intent !== 'string') {
        return {
          valid: false,
          error: 'Free answer must have intent as a string',
        }
      }
      if (answerData.suit && typeof answerData.suit !== 'string') {
        return {
          valid: false,
          error: 'Free answer suit must be a string if provided',
        }
      }
      if (answerData.strength && typeof answerData.strength !== 'string') {
        return {
          valid: false,
          error: 'Free answer strength must be a string if provided',
        }
      }
      return { valid: true }

    case AnswerType.MULTIPLE_CHOICE:
      if (!answerData.option || typeof answerData.option !== 'string') {
        return {
          valid: false,
          error: 'Multiple choice answer must have option as a string',
        }
      }
      return { valid: true }

    default:
      return {
        valid: false,
        error: `Unknown answer type: ${answerType}`,
      }
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { questionId, attemptId, answerData } = body

    if (!questionId || !attemptId || !answerData) {
      return NextResponse.json(
        { error: 'Question ID, attempt ID, and answer data are required' },
        { status: 400 }
      )
    }

    // Get existing answer
    const existingAnswer = await db.answer.findUnique({
      where: {
        questionId_userId_attemptId: {
          questionId,
          userId: user.id,
          attemptId,
        },
      },
      include: {
        question: {
          select: {
            id: true,
            answerType: true,
            answerOptions: true,
          },
        },
      },
    })

    if (!existingAnswer) {
      return NextResponse.json(
        { error: 'Answer not found' },
        { status: 404 }
      )
    }

    // Check editability
    const editability = await checkAnswerEditability(
      questionId,
      attemptId,
      user.id
    )
    if (!editability.editable) {
      return NextResponse.json(
        { error: editability.reason || 'Answer cannot be edited' },
        { status: 400 }
      )
    }

    // Validate answer data structure
    const validation = validateAnswerData(
      existingAnswer.question.answerType,
      answerData
    )
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Validate answer option for multiple choice, double interpretation, and redouble interpretation
    if (
      (existingAnswer.question.answerType === AnswerType.MULTIPLE_CHOICE ||
        existingAnswer.question.answerType === AnswerType.DOUBLE_INTERPRETATION ||
        existingAnswer.question.answerType === AnswerType.REDOUBLE_INTERPRETATION) &&
      existingAnswer.question.answerOptions &&
      Array.isArray(existingAnswer.question.answerOptions)
    ) {
      if (!existingAnswer.question.answerOptions.includes(answerData.option)) {
        return NextResponse.json(
          { error: 'Selected option is not valid for this question' },
          { status: 400 }
        )
      }
    }

    // Get attempt to check completion
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        status: true,
        partnershipId: true,
        quizId: true,
      },
    })

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    // Update answer
    const updatedAnswer = await db.answer.update({
      where: {
        questionId_userId_attemptId: {
          questionId,
          userId: user.id,
          attemptId,
        },
      },
      data: {
        answerData,
      },
    })

    // Check if attempt should be marked as completed
    const question = await db.question.findUnique({
      where: { id: questionId },
      select: {
        quizId: true,
        quiz: {
          select: {
            questions: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    if (question) {
      const totalQuestions = question.quiz.questions.length

      // Get count of questions answered by this user in this attempt
      const answeredCount = await db.answer.count({
        where: {
          attemptId,
          userId: user.id,
        },
      })

      // For partnership attempts, check if all members have answered all questions
      // Note: Each member has their own attempt, so we need to check all attempts for this partnership and quiz
      let allMembersCompleted = false
      if (attempt.partnershipId) {
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

        if (partnership) {
          const memberIds = partnership.members.map((m) => m.userId)
          
          // Get all IN_PROGRESS attempts for this partnership and quiz (exclude completed attempts)
          const allAttempts = await db.attempt.findMany({
            where: {
              partnershipId: attempt.partnershipId,
              quizId: attempt.quizId,
              userId: {
                in: memberIds,
              },
              status: AttemptStatus.IN_PROGRESS, // Only check current attempts, not old completed ones
            },
            select: {
              id: true,
              userId: true,
            },
          })

          // Check if all members have answered all questions in their respective attempts
          const completionChecks = await Promise.all(
            memberIds.map(async (memberId) => {
              const memberAttempt = allAttempts.find((a) => a.userId === memberId)
              if (!memberAttempt) return false

              const memberAnswerCount = await db.answer.count({
                where: {
                  attemptId: memberAttempt.id,
                  userId: memberId,
                },
              })

              return memberAnswerCount === totalQuestions
            })
          )

          allMembersCompleted = completionChecks.every((completed) => completed === true)

          // If all members completed, mark ALL their attempts as completed
          if (allMembersCompleted) {
            await db.attempt.updateMany({
              where: {
                partnershipId: attempt.partnershipId,
                quizId: attempt.quizId,
                userId: {
                  in: memberIds,
                },
                status: {
                  not: AttemptStatus.COMPLETED,
                },
              },
              data: {
                status: AttemptStatus.COMPLETED,
                completedAt: new Date(),
              },
            })
          }
        }
      } else {
        // For class attempts, completion is individual
        allMembersCompleted = answeredCount === totalQuestions
        
        // Update attempt status if completed
        if (allMembersCompleted && attempt.status !== AttemptStatus.COMPLETED) {
          await db.attempt.update({
            where: { id: attemptId },
            data: {
              status: AttemptStatus.COMPLETED,
              completedAt: new Date(),
            },
          })
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Answer updated successfully',
        answer: updatedAnswer,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Update answer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { AnswerType, AttemptStatus } from '@prisma/client'
import { checkAnswerEditability } from '@/lib/answer-visibility'

/**
 * Validate answer data structure based on answer type
 */
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

    case AnswerType.FREE_ANSWER:
      if (!answerData.intent || typeof answerData.intent !== 'string') {
        return {
          valid: false,
          error: 'Free answer must have intent as a string',
        }
      }
      // Suit and strength are optional
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

export async function POST(request: NextRequest) {
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

    // Verify question exists
    const question = await db.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        answerType: true,
        answerOptions: true,
        quiz: {
          select: {
            id: true,
            questions: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Validate answer data structure
    const validation = validateAnswerData(question.answerType, answerData)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Validate answer option for multiple choice and double interpretation
    if (
      (question.answerType === AnswerType.MULTIPLE_CHOICE ||
        question.answerType === AnswerType.DOUBLE_INTERPRETATION) &&
      question.answerOptions &&
      Array.isArray(question.answerOptions)
    ) {
      if (!question.answerOptions.includes(answerData.option)) {
        return NextResponse.json(
          { error: 'Selected option is not valid for this question' },
          { status: 400 }
        )
      }
    }

    // Verify attempt exists and belongs to user
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        quizId: true,
        status: true,
        partnershipId: true,
        classId: true,
      },
    })

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    // Verify attempt belongs to quiz
    if (attempt.quizId !== question.quiz.id) {
      return NextResponse.json(
        { error: 'Question does not belong to the quiz in this attempt' },
        { status: 400 }
      )
    }

    // Verify user owns the attempt
    if (attempt.userId !== user.id) {
      return NextResponse.json(
        { error: 'You can only submit answers to your own attempts' },
        { status: 403 }
      )
    }

    // Check if answer already exists
    const existingAnswer = await db.answer.findUnique({
      where: {
        questionId_userId_attemptId: {
          questionId,
          userId: user.id,
          attemptId,
        },
      },
    })

    if (existingAnswer) {
      return NextResponse.json(
        { error: 'Answer already exists. Use update endpoint to modify it.' },
        { status: 400 }
      )
    }

    // Check editability (should be editable for new answers, but check anyway)
    const editability = await checkAnswerEditability(questionId, attemptId, user.id)
    if (!editability.editable) {
      return NextResponse.json(
        { error: editability.reason || 'Answer cannot be submitted' },
        { status: 400 }
      )
    }

    // Create answer
    const answer = await db.answer.create({
      data: {
        questionId,
        userId: user.id,
        attemptId,
        answerData,
      },
    })

    // Check if attempt should be marked as completed
    // Get all questions in the quiz
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
        
        // Get all attempts for this partnership and quiz
        const allAttempts = await db.attempt.findMany({
          where: {
            partnershipId: attempt.partnershipId,
            quizId: attempt.quizId,
            userId: {
              in: memberIds,
            },
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

    return NextResponse.json(
      {
        message: 'Answer submitted successfully',
        answer,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Submit answer error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { AttemptStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('attemptId')

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
        { status: 400 }
      )
    }

    // Get attempt
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: {
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
        partnership: {
          include: {
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    })

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      )
    }

    // Verify user has access
    if (attempt.userId !== user.id) {
      if (attempt.partnershipId) {
        const isMember = attempt.partnership?.members.some(
          (m) => m.userId === user.id
        )
        if (!isMember) {
          return NextResponse.json(
            { error: 'You do not have permission to view this attempt' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'You do not have permission to view this attempt' },
          { status: 403 }
        )
      }
    }

    const totalQuestions = attempt.quiz.questions.length

    // For partnership attempts, check if all members have completed
    if (attempt.partnershipId && attempt.partnership) {
      const memberIds = attempt.partnership.members.map((m) => m.userId)

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

      // Check if all members have answered all questions
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

      const allMembersCompleted = completionChecks.every((completed) => completed === true)

      return NextResponse.json(
        {
          allMembersCompleted,
          isLastToFinish: allMembersCompleted,
        },
        { status: 200 }
      )
    } else {
      // For class attempts, check individual completion
      const answeredCount = await db.answer.count({
        where: {
          attemptId,
          userId: user.id,
        },
      })

      const isCompleted = answeredCount === totalQuestions

      return NextResponse.json(
        {
          allMembersCompleted: isCompleted,
          isLastToFinish: isCompleted,
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Check completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


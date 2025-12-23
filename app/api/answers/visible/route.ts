import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { checkAnswerVisibility } from '@/lib/answer-visibility'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('attemptId')
    const questionId = searchParams.get('questionId')

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
        { status: 400 }
      )
    }

    // Verify attempt exists and user has access
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        userId: true,
        quizId: true,
        partnershipId: true,
        classId: true,
        partnership: {
          include: {
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
        class: {
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

    // Check access
    let hasAccess = false
    if (attempt.userId === user.id) {
      hasAccess = true
    } else if (attempt.partnershipId) {
      hasAccess = attempt.partnership?.members.some((m) => m.userId === user.id) || false
    } else if (attempt.classId) {
      hasAccess = attempt.class?.members.some((m) => m.userId === user.id) || false
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to view this attempt' },
        { status: 403 }
      )
    }

    // If questionId is provided, get visibility for that specific question
    if (questionId) {
      const visibility = await checkAnswerVisibility(questionId, attemptId)

      // Get answers for this question if visible
      let answers = null
      if (visibility.visible) {
        answers = await db.answer.findMany({
          where: {
            questionId,
            attemptId,
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        })
      }

      return NextResponse.json(
        {
          questionId,
          visibility,
          answers: visibility.visible ? answers : null,
        },
        { status: 200 }
      )
    }

    // If no questionId, get visibility for all questions in the attempt
    const quiz = await db.quiz.findUnique({
      where: { id: attempt.quizId },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
          select: {
            id: true,
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    // Get visibility for each question
    const questionVisibilities = await Promise.all(
      quiz.questions.map(async (question) => {
        const visibility = await checkAnswerVisibility(question.id, attemptId)
        let answers = null

        if (visibility.visible) {
          answers = await db.answer.findMany({
            where: {
              questionId: question.id,
              attemptId,
            },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          })
        }

        return {
          questionId: question.id,
          visibility,
          answers: visibility.visible ? answers : null,
        }
      })
    )

    return NextResponse.json(
      {
        attemptId,
        questions: questionVisibilities,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get visible answers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


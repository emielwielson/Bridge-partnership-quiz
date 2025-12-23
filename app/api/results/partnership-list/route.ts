import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth/middleware'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
import { calculateAgreement, calculateOverallScore } from '@/lib/agreement-scorer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('quizId')

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      )
    }

    // Verify quiz exists and user is creator
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        creatorId: true,
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

    if (quiz.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only view results for quizzes you created' },
        { status: 403 }
      )
    }

    // Get all partnership attempts for this quiz
    const attempts = await db.attempt.findMany({
      where: {
        quizId,
        partnershipId: {
          not: null,
        },
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
        answers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
            question: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    })

    // Group attempts by partnership
    const partnershipsMap = new Map<
      string,
      {
        partnershipId: string
        members: Array<{ id: string; username: string }>
        attempts: typeof attempts
      }
    >()

    attempts.forEach((attempt) => {
      if (attempt.partnershipId && attempt.partnership) {
        const existing = partnershipsMap.get(attempt.partnershipId)
        if (existing) {
          existing.attempts.push(attempt)
        } else {
          partnershipsMap.set(attempt.partnershipId, {
            partnershipId: attempt.partnershipId,
            members: attempt.partnership.members.map((m) => ({
              id: m.user.id,
              username: m.user.username,
            })),
            attempts: [attempt],
          })
        }
      }
    })

    // Calculate statistics for each partnership
    const partnerships = Array.from(partnershipsMap.values()).map((partnership) => {
      const partnershipStats = partnership.attempts.map((attempt) => {
        // Group answers by question
        const answersByQuestion = new Map<string, any[]>()
        attempt.answers.forEach((answer) => {
          const existing = answersByQuestion.get(answer.questionId) || []
          existing.push(answer.answerData)
          answersByQuestion.set(answer.questionId, existing)
        })

        // Calculate agreement for each question
        const questionAgreements = quiz.questions.map((question) => {
          const questionAnswers = answersByQuestion.get(question.id) || []
          return calculateAgreement(questionAnswers)
        })

        const overallScore = calculateOverallScore(questionAgreements)

        // Calculate completion status
        const memberIds = partnership.members.map((m) => m.id)
        const answersByUser = new Map<string, number>()
        attempt.answers.forEach((answer) => {
          const count = answersByUser.get(answer.userId) || 0
          answersByUser.set(answer.userId, count + 1)
        })

        const individualCompletion = memberIds.map((memberId) => ({
          userId: memberId,
          username: partnership.members.find((m) => m.id === memberId)?.username || '',
          questionsAnswered: answersByUser.get(memberId) || 0,
          totalQuestions: quiz.questions.length,
          completed: (answersByUser.get(memberId) || 0) === quiz.questions.length,
        }))

        const partnershipCompleted = individualCompletion.every((m) => m.completed)

        return {
          attemptId: attempt.id,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
          status: attempt.status,
          overallScore,
          questionAgreements: questionAgreements.map((qa, idx) => ({
            questionId: quiz.questions[idx].id,
            ...qa,
          })),
          individualCompletion,
          partnershipCompleted,
        }
      })

      return {
        partnershipId: partnership.partnershipId,
        members: partnership.members,
        attempts: partnershipStats,
      }
    })

    return NextResponse.json(
      {
        quiz: {
          id: quiz.id,
          title: quiz.title,
        },
        partnerships,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Partnership list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


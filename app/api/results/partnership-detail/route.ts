import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { calculateAgreement } from '@/lib/agreement-scorer'

export async function GET(request: NextRequest) {
  try {
export const dynamic = 'force-dynamic'

    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const partnershipId = searchParams.get('partnershipId')
    const attemptId = searchParams.get('attemptId')
    const quizId = searchParams.get('quizId')

    if (!partnershipId || !attemptId) {
      return NextResponse.json(
        { error: 'Partnership ID and Attempt ID are required' },
        { status: 400 }
      )
    }

    // Verify quiz exists and user is creator (if quizId provided)
    if (quizId) {
      const quiz = await db.quiz.findUnique({
        where: { id: quizId },
        select: {
          creatorId: true,
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
    }

    // Get attempt
    const attempt = await db.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: {
                order: 'asc',
              },
              include: {
                auction: {
                  include: {
                    bids: {
                      orderBy: {
                        sequence: 'asc',
                      },
                      include: {
                        alert: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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

    if (attempt.partnershipId !== partnershipId) {
      return NextResponse.json(
        { error: 'Attempt does not belong to this partnership' },
        { status: 400 }
      )
    }

    // Group answers by question
    const answersByQuestion = new Map<string, typeof attempt.answers>()
    attempt.answers.forEach((answer) => {
      const existing = answersByQuestion.get(answer.questionId) || []
      existing.push(answer)
      answersByQuestion.set(answer.questionId, existing)
    })

    // Build question-by-question results
    const questionResults = attempt.quiz.questions.map((question) => {
      const questionAnswers = answersByQuestion.get(question.id) || []
      const answerDataArray = questionAnswers.map((a) => a.answerData)
      const agreement = calculateAgreement(answerDataArray)

      // Build side-by-side answer comparison
      const memberAnswers = attempt.partnership!.members.map((member) => {
        const answer = questionAnswers.find((a) => a.userId === member.userId)
        return {
          userId: member.userId,
          username: member.user.username,
          answer: answer ? answer.answerData : null,
          answered: !!answer,
        }
      })

      return {
        questionId: question.id,
        questionOrder: question.order,
        prompt: question.prompt,
        auction: question.auction,
        agreement,
        memberAnswers,
      }
    })

    return NextResponse.json(
      {
        partnership: {
          id: attempt.partnershipId,
          members: attempt.partnership!.members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
          })),
        },
        attempt: {
          id: attempt.id,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
          status: attempt.status,
        },
        quiz: {
          id: attempt.quiz.id,
          title: attempt.quiz.title,
        },
        questions: questionResults,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Partnership detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


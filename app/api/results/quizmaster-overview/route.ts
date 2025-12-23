import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { calculateAgreement } from '@/lib/agreement-scorer'

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
          include: {
            _count: {
              select: {
                answers: true,
              },
            },
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

    // Get all completed partnership attempts for this quiz
    const attempts = await db.attempt.findMany({
      where: {
        quizId,
        partnershipId: {
          not: null,
        },
        status: 'COMPLETED',
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
          },
        },
      },
    })

    // Group attempts by partnership (multiple attempts per partnership)
    const partnershipAttempts = new Map<string, typeof attempts>()
    attempts.forEach((attempt) => {
      if (attempt.partnershipId) {
        const existing = partnershipAttempts.get(attempt.partnershipId) || []
        existing.push(attempt)
        partnershipAttempts.set(attempt.partnershipId, existing)
      }
    })

    const totalPartnerships = partnershipAttempts.size

    // Calculate statistics for each question
    const questionStats = quiz.questions.map((question) => {
      // Get all answers for this question across all attempts
      const allAnswers = attempts.flatMap((attempt) =>
        attempt.answers
          .filter((a) => a.questionId === question.id)
          .map((a) => ({
            attemptId: attempt.id,
            partnershipId: attempt.partnershipId!,
            answerData: a.answerData,
          }))
      )

      // Group answers by partnership and attempt
      const answersByPartnershipAttempt = new Map<
        string,
        { partnershipId: string; answers: any[] }
      >()

      allAnswers.forEach((answer) => {
        const key = `${answer.partnershipId}-${answer.attemptId}`
        const existing = answersByPartnershipAttempt.get(key) || {
          partnershipId: answer.partnershipId,
          answers: [],
        }
        existing.answers.push(answer.answerData)
        answersByPartnershipAttempt.set(key, existing)
      })

      // Calculate agreement for each partnership attempt
      let partnershipsWithSameAnswer = 0
      let partnershipsWithDifferentAnswers = 0

      answersByPartnershipAttempt.forEach((group) => {
        const agreement = calculateAgreement(group.answers)
        if (agreement.agreed) {
          partnershipsWithSameAnswer++
        } else {
          partnershipsWithDifferentAnswers++
        }
      })

      const totalPartnershipAttempts = answersByPartnershipAttempt.size
      const sameAnswerPercent =
        totalPartnershipAttempts > 0
          ? Math.round((partnershipsWithSameAnswer / totalPartnershipAttempts) * 100)
          : 0
      const differentAnswerPercent =
        totalPartnershipAttempts > 0
          ? Math.round((partnershipsWithDifferentAnswers / totalPartnershipAttempts) * 100)
          : 0

      return {
        questionId: question.id,
        questionOrder: question.order,
        totalPartnershipAttempts,
        partnershipsWithSameAnswer,
        partnershipsWithDifferentAnswers,
        sameAnswerPercent,
        differentAnswerPercent,
        totalAnswers: allAnswers.length,
      }
    })

    return NextResponse.json(
      {
        quiz: {
          id: quiz.id,
          title: quiz.title,
        },
        totalPartnerships,
        totalAttempts: attempts.length,
        questions: questionStats,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Quizmaster overview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


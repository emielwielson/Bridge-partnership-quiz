import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { calculateAgreement } from '@/lib/agreement-scorer'

export async function GET(request: NextRequest) {
  try {
export const dynamic = 'force-dynamic'

    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('quizId')
    const questionId = searchParams.get('questionId')

    if (!quizId || !questionId) {
      return NextResponse.json(
        { error: 'Quiz ID and Question ID are required' },
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
          where: {
            id: questionId,
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

    const question = quiz.questions[0]
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
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
        answers: {
          where: {
            questionId,
          },
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

    // Group answers by partnership attempt
    const answersByPartnershipAttempt = new Map<
      string,
      { partnershipId: string; attemptId: string; answers: any[] }
    >()

    attempts.forEach((attempt) => {
      if (attempt.partnershipId && attempt.answers.length > 0) {
        const key = `${attempt.partnershipId}-${attempt.id}`
        answersByPartnershipAttempt.set(key, {
          partnershipId: attempt.partnershipId,
          attemptId: attempt.id,
          answers: attempt.answers.map((a) => a.answerData),
        })
      }
    })

    // Calculate agreement for each partnership attempt
    const partnershipAgreements = Array.from(answersByPartnershipAttempt.values()).map(
      (group) => {
        const agreement = calculateAgreement(group.answers)
        return {
          partnershipId: group.partnershipId,
          attemptId: group.attemptId,
          ...agreement,
        }
      }
    )

    // Count agreements vs disagreements
    const agreedCount = partnershipAgreements.filter((a) => a.agreed).length
    const disagreedCount = partnershipAgreements.filter((a) => !a.agreed).length
    const totalPartnerships = partnershipAgreements.length

    // Build answer distribution
    // Group all unique answers and count occurrences
    const answerDistribution = new Map<string, { answer: any; count: number; agreements: number }>()

    answersByPartnershipAttempt.forEach((group) => {
      const agreement = calculateAgreement(group.answers)
      // Use JSON string as key for grouping
      group.answers.forEach((answer) => {
        const key = JSON.stringify(answer)
        const existing = answerDistribution.get(key)
        if (existing) {
          existing.count++
          if (agreement.agreed) {
            existing.agreements++
          }
        } else {
          answerDistribution.set(key, {
            answer,
            count: 1,
            agreements: agreement.agreed ? 1 : 0,
          })
        }
      })
    })

    // Convert to array and calculate percentages
      const totalAnswers = Array.from(answerDistribution.values()).reduce((sum, item) => sum + item.count, 0)
      const distribution = Array.from(answerDistribution.values())
        .map((item) => ({
          answer: item.answer,
          count: item.count,
          agreements: item.agreements,
          percentage: totalAnswers > 0
            ? Math.round((item.count / totalAnswers) * 100)
            : 0,
          agreementPercentage: item.count > 0
            ? Math.round((item.agreements / item.count) * 100)
            : 0,
        }))
        .sort((a, b) => b.count - a.count)

    return NextResponse.json(
      {
        question: {
          id: question.id,
          prompt: question.prompt,
          auction: question.auction,
        },
        quiz: {
          id: quiz.id,
          title: quiz.title,
        },
        statistics: {
          totalPartnerships,
          agreedCount,
          disagreedCount,
          agreedPercent: totalPartnerships > 0
            ? Math.round((agreedCount / totalPartnerships) * 100)
            : 0,
          disagreedPercent: totalPartnerships > 0
            ? Math.round((disagreedCount / totalPartnerships) * 100)
            : 0,
        },
        answerDistribution: distribution,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Question detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


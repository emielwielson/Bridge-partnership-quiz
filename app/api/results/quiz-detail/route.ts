import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { calculateAgreement } from '@/lib/agreement-scorer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {

    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('quizId')
    const partnershipId = searchParams.get('partnershipId')
    const attemptId = searchParams.get('attemptId') // Optional: specific attempt to show

    if (!quizId || !partnershipId) {
      return NextResponse.json(
        { error: 'Quiz ID and Partnership ID are required' },
        { status: 400 }
      )
    }

    // Verify partnership exists and user is a member
    const partnership = await db.partnership.findUnique({
      where: { id: partnershipId },
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
    })

    if (!partnership) {
      return NextResponse.json(
        { error: 'Partnership not found' },
        { status: 404 }
      )
    }

    const memberIds = partnership.members.map((m) => m.userId)
    if (!memberIds.includes(user.id)) {
      return NextResponse.json(
        { error: 'You are not a member of this partnership' },
        { status: 403 }
      )
    }

    // If attemptId is provided, find all attempts from the same attempt set
    // (attempts created at the same time for the same quiz/partnership)
    let attempts
    if (attemptId) {
      // Get the reference attempt to find its startedAt time
      const referenceAttempt = await db.attempt.findUnique({
        where: { id: attemptId },
        select: { startedAt: true },
      })

      if (!referenceAttempt) {
        return NextResponse.json(
          { error: 'Attempt not found' },
          { status: 404 }
        )
      }

      // Find all attempts from the same attempt set (same startedAt, within 1 second)
      const startedAtStart = new Date(referenceAttempt.startedAt.getTime() - 1000)
      const startedAtEnd = new Date(referenceAttempt.startedAt.getTime() + 1000)

      attempts = await db.attempt.findMany({
        where: {
          quizId,
          partnershipId,
          userId: {
            in: memberIds,
          },
          status: 'COMPLETED',
          startedAt: {
            gte: startedAtStart,
            lte: startedAtEnd,
          },
        },
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
        orderBy: {
          completedAt: 'desc',
        },
      })
    } else {
      // Fallback: Get the most recent completed attempts (old behavior)
      attempts = await db.attempt.findMany({
        where: {
          quizId,
          partnershipId,
          userId: {
            in: memberIds,
          },
          status: 'COMPLETED',
        },
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
        orderBy: {
          completedAt: 'desc',
        },
      })

      // Group by startedAt to get the most recent attempt set
      const attemptsByStartedAt = new Map<string, typeof attempts>()
      attempts.forEach((attempt) => {
        const key = attempt.startedAt.toISOString()
        const existing = attemptsByStartedAt.get(key) || []
        existing.push(attempt)
        attemptsByStartedAt.set(key, existing)
      })

      // Get the most recent attempt set
      const sortedKeys = Array.from(attemptsByStartedAt.keys()).sort().reverse()
      if (sortedKeys.length > 0) {
        attempts = attemptsByStartedAt.get(sortedKeys[0]) || []
      } else {
        attempts = []
      }
    }

    if (attempts.length === 0) {
      return NextResponse.json(
        { error: 'No completed attempts found for this quiz' },
        { status: 404 }
      )
    }

    // Get quiz data from the first attempt (all attempts share the same quiz)
    const quizData = attempts[0].quiz

    // Collect answers from ALL attempts, grouped by question
    // Each member has their own attempt, so we need to collect answers from all attempts
    const answersByQuestion = new Map<string, any[]>()
    
    attempts.forEach((attempt) => {
      attempt.answers.forEach((answer) => {
        const existing = answersByQuestion.get(answer.questionId) || []
        existing.push(answer)
        answersByQuestion.set(answer.questionId, existing)
      })
    })

    // Build question details with answers from all attempts
    const questionDetails = quizData.questions.map((question) => {
      const questionAnswers = answersByQuestion.get(question.id) || []
      
      // Get answers for each member (from their respective attempts)
      const memberAnswers = partnership.members.map((member) => {
        const memberAnswer = questionAnswers.find((a) => a.userId === member.userId)
        return {
          userId: member.userId,
          username: member.user.username,
          answer: memberAnswer ? memberAnswer.answerData : null,
        }
      })

      // Calculate agreement - all members must have answered AND all answers must be the same
      const answerDataArray = memberAnswers
        .filter((ma) => ma.answer !== null)
        .map((ma) => ma.answer)
      
      // Agreement requires: (1) all members answered, (2) all answers are identical
      const allMembersAnswered = memberAnswers.every((ma) => ma.answer !== null)
      const agreement = calculateAgreement(answerDataArray)
      const agreed = allMembersAnswered && agreement.agreed

      return {
        questionId: question.id,
        order: question.order,
        prompt: question.prompt,
        answerType: question.answerType,
        auction: question.auction,
        memberAnswers,
        agreed,
      }
    })

    // Get the most recent completion date from all attempts
    const mostRecentCompletedAt = attempts[0]?.completedAt || new Date()

    return NextResponse.json(
      {
        quiz: {
          id: quizData.id,
          title: quizData.title,
          topic: quizData.topic,
        },
        partnership: {
          id: partnership.id,
          members: partnership.members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
          })),
        },
        completedAt: mostRecentCompletedAt,
        questions: questionDetails,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Quiz detail results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { calculateAgreement, calculateOverallScore } from '@/lib/agreement-scorer'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const partnershipId = searchParams.get('partnershipId')
    const partnerId = searchParams.get('partnerId') // Keep for backward compatibility

    if (!partnershipId && !partnerId) {
      return NextResponse.json(
        { error: 'Either partnershipId or partnerId is required' },
        { status: 400 }
      )
    }

    // Find partnership by ID if provided, otherwise find by partner ID
    let partnership
    if (partnershipId) {
      partnership = await db.partnership.findUnique({
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
          attempts: {
            include: {
              quiz: {
                select: {
                  id: true,
                  title: true,
                  topic: true,
                  questions: {
                    orderBy: {
                      order: 'asc',
                    },
                    select: {
                      id: true,
                    },
                  },
                },
              },
              answers: {
                include: {
                  question: {
                    select: {
                      id: true,
                    },
                  },
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
              startedAt: 'desc',
            },
          },
        },
      })
    } else {
      // Fallback to old behavior for backward compatibility
      partnership = await db.partnership.findFirst({
        where: {
          members: {
            every: {
              userId: {
                in: [user.id, partnerId!],
              },
            },
          },
        },
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
        attempts: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                topic: true,
                questions: {
                  orderBy: {
                    order: 'asc',
                  },
                  select: {
                    id: true,
                  },
                },
              },
            },
            answers: {
              include: {
                question: {
                  select: {
                    id: true,
                  },
                },
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
            startedAt: 'desc',
          },
        },
      },
      })
    }

    if (!partnership) {
      return NextResponse.json(
        { error: 'Partnership not found' },
        { status: 404 }
      )
    }

    // Verify user is a member
    const memberIds = partnership.members.map((m) => m.userId)
    if (!memberIds.includes(user.id)) {
      return NextResponse.json(
        { error: 'You are not a member of this partnership' },
        { status: 403 }
      )
    }
    
    // If partnerId was provided, verify they are also a member
    if (partnerId && !memberIds.includes(partnerId)) {
      return NextResponse.json(
        { error: 'Partner is not a member of this partnership' },
        { status: 403 }
      )
    }
    
    // Get partner ID from partnership members if not provided
    const actualPartnerId = partnerId || partnership.members.find((m) => m.userId !== user.id)?.userId

    // Group attempts by quiz
    const attemptsByQuiz = new Map<string, typeof partnership.attempts>()
    partnership.attempts.forEach((attempt) => {
      const existing = attemptsByQuiz.get(attempt.quizId) || []
      existing.push(attempt)
      attemptsByQuiz.set(attempt.quizId, existing)
    })

    // Calculate results for each quiz (combining all attempts for that quiz)
    const quizResults = Array.from(attemptsByQuiz.entries()).map(([quizId, quizAttempts]) => {
      // Get quiz data from first attempt (all attempts share the same quiz)
      const quiz = quizAttempts[0].quiz

      // Collect answers from ALL attempts for this quiz (one per member)
      const answersByQuestion = new Map<string, any[]>()
      quizAttempts.forEach((attempt) => {
        attempt.answers.forEach((answer) => {
          const existing = answersByQuestion.get(answer.questionId) || []
          existing.push(answer)
          answersByQuestion.set(answer.questionId, existing)
        })
      })

      // Calculate agreement for each question
      // Agreement requires: (1) all members answered, (2) all answers are identical
      const questionAgreements = quiz.questions.map((question) => {
        const questionAnswers = answersByQuestion.get(question.id) || []
        
        // Get answers for each member
        const memberAnswerMap = new Map<string, any>()
        questionAnswers.forEach((answer) => {
          memberAnswerMap.set(answer.userId, answer.answerData)
        })

        // Check if all members have answered
        const allMembersAnswered = memberIds.every((memberId) => memberAnswerMap.has(memberId))
        
        if (!allMembersAnswered) {
          // Not all members answered, so not agreed
          return {
            agreed: false,
            answerCount: questionAnswers.length,
            uniqueAnswers: 0,
          }
        }

        // All members answered, check if answers are identical
        const answerDataArray = Array.from(memberAnswerMap.values())
        return calculateAgreement(answerDataArray)
      })

      const overallScore = calculateOverallScore(questionAgreements)

      // Calculate completion status
      const answersByUser = new Map<string, number>()
      quizAttempts.forEach((attempt) => {
        attempt.answers.forEach((answer) => {
          const count = answersByUser.get(answer.userId) || 0
          answersByUser.set(answer.userId, count + 1)
        })
      })

      const individualCompletion = partnership.members.map((member) => ({
        userId: member.userId,
        username: member.user.username,
        questionsAnswered: answersByUser.get(member.userId) || 0,
        totalQuestions: quiz.questions.length,
        completed: (answersByUser.get(member.userId) || 0) === quiz.questions.length,
      }))

      const partnershipCompleted = individualCompletion.every((m) => m.completed)

      // Build per-question comparison
      const questionComparisons = quiz.questions.map((question) => {
        const questionAnswers = answersByQuestion.get(question.id) || []
        const userAnswer = questionAnswers.find((a) => a.userId === user.id)
        const partnerAnswer = actualPartnerId ? questionAnswers.find((a) => a.userId === actualPartnerId) : null
        
        // Calculate agreement - all members must have answered AND all answers must be identical
        const memberAnswerMap = new Map<string, any>()
        questionAnswers.forEach((answer) => {
          memberAnswerMap.set(answer.userId, answer.answerData)
        })
        
        const allMembersAnswered = memberIds.every((memberId) => memberAnswerMap.has(memberId))
        const answerDataArray = Array.from(memberAnswerMap.values())
        const agreement = calculateAgreement(answerDataArray)
        const agreed = allMembersAnswered && agreement.agreed

        return {
          questionId: question.id,
          userAnswer: userAnswer ? userAnswer.answerData : null,
          partnerAnswer: partnerAnswer ? partnerAnswer.answerData : null,
          agreed,
        }
      })

      // Get the most recent attempt for metadata
      const mostRecentAttempt = quizAttempts.sort((a, b) => {
        const dateA = a.completedAt || a.startedAt
        const dateB = b.completedAt || b.startedAt
        return dateB.getTime() - dateA.getTime()
      })[0]

      return {
        attemptId: mostRecentAttempt.id,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          topic: quiz.topic,
        },
        startedAt: mostRecentAttempt.startedAt,
        completedAt: mostRecentAttempt.completedAt,
        status: mostRecentAttempt.status,
        overallScore,
        individualCompletion,
        partnershipCompleted,
        questionComparisons,
      }
    })

    // Group by quiz
    const quizzesMap = new Map<string, typeof quizResults>()
    quizResults.forEach((result) => {
      const existing = quizzesMap.get(result.quiz.id) || []
      existing.push(result)
      quizzesMap.set(result.quiz.id, existing)
    })

    const quizzes = Array.from(quizzesMap.entries()).map(([quizId, attempts]) => ({
      quizId,
      quizTitle: attempts[0].quiz.title,
      quizTopic: attempts[0].quiz.topic,
      attempts,
    }))

    return NextResponse.json(
      {
        partnership: {
          id: partnership.id,
          members: partnership.members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
          })),
        },
        partner: actualPartnerId ? partnership.members.find((m) => m.userId === actualPartnerId)?.user || null : null,
        quizzes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Player partnership results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


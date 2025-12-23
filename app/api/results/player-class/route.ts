import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Verify user is a member of the class
    const classMember = await db.classMember.findUnique({
      where: {
        classId_userId: {
          classId,
          userId: user.id,
        },
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!classMember) {
      return NextResponse.json(
        { error: 'You are not a member of this class' },
        { status: 403 }
      )
    }

    // Get all attempts for this user in this class
    const attempts = await db.attempt.findMany({
      where: {
        classId,
        userId: user.id,
      },
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
                prompt: true,
                answerType: true,
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

    // Build results for each attempt
    const results = attempts.map((attempt) => {
      // Map answers to questions
      const answersByQuestion = new Map(
        attempt.answers.map((a) => [a.questionId, a])
      )

      const questionResults = attempt.quiz.questions.map((question) => ({
        questionId: question.id,
        prompt: question.prompt,
        answerType: question.answerType,
        auction: question.auction,
        userAnswer: answersByQuestion.get(question.id)?.answerData || null,
        answered: answersByQuestion.has(question.id),
      }))

      const totalQuestions = attempt.quiz.questions.length
      const answeredQuestions = questionResults.filter((q) => q.answered).length

      return {
        attemptId: attempt.id,
        quiz: {
          id: attempt.quiz.id,
          title: attempt.quiz.title,
          topic: attempt.quiz.topic,
        },
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        status: attempt.status,
        totalQuestions,
        answeredQuestions,
        completionPercent:
          totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0,
        questions: questionResults,
      }
    })

    // Group by quiz
    const quizzesMap = new Map<string, typeof results>()
    results.forEach((result) => {
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
        class: {
          id: classMember.class.id,
          name: classMember.class.name,
        },
        quizzes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Player class results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


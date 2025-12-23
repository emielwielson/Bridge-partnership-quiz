import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const attemptId = searchParams.get('id')

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
        { status: 400 }
      )
    }

    // Get attempt with all related data
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
        answers: {
          where: {
            userId: user.id, // Only get current user's answers
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
        class: {
          include: {
            members: {
              where: {
                userId: user.id,
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

    // Verify user has access to this attempt
    if (attempt.userId !== user.id) {
      // For partnership attempts, check if user is a member
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
      } else if (attempt.classId) {
        // For class attempts, check if user is a member
        const isMember = attempt.class?.members.some((m) => m.userId === user.id)
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

    // Map answers to questions for easier access
    const answersByQuestion = new Map(
      attempt.answers.map((a) => [a.questionId, a])
    )

    // Add answer data to questions
    const questionsWithAnswers = attempt.quiz.questions.map((question) => ({
      ...question,
      userAnswer: answersByQuestion.get(question.id) || null,
    }))

    return NextResponse.json(
      {
        attempt: {
          ...attempt,
          userId: attempt.userId, // Include userId in response
          quiz: {
            ...attempt.quiz,
            questions: questionsWithAnswers,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get attempt error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


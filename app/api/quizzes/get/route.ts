import { NextRequest, NextResponse } from 'next/server'
import { optionalAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { checkQuestionEditability } from '@/lib/question-editability'
import { QuizState } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await optionalAuth(request)
    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('id')

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      )
    }

    // Get quiz with all related data
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
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

    // Check permissions
    // Published quizzes are public
    // Draft quizzes are only visible to creator
    if (quiz.state === QuizState.DRAFT) {
      if (!user || quiz.creatorId !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to view this quiz' },
          { status: 403 }
        )
      }
    }

    // Check editability for each question
    const questionsWithEditability = await Promise.all(
      quiz.questions.map(async (question) => {
        const editability = await checkQuestionEditability(question.id)
        return {
          ...question,
          editable: editability.editable,
          editabilityReason: editability.reason,
        }
      })
    )

    return NextResponse.json(
      {
        quiz: {
          ...quiz,
          questions: questionsWithEditability,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


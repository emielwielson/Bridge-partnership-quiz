import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { optionalAuth } from '@/lib/auth/middleware'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
import { checkQuestionEditability } from '@/lib/question-editability'
export const dynamic = 'force-dynamic'
import { QuizState } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await optionalAuth(request)
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('id')

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    // Get question with all related data
    const question = await db.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          select: {
            id: true,
            creatorId: true,
            state: true,
          },
        },
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
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Check permissions
    // Published quizzes are public
    // Draft quizzes are only visible to creator
    if (question.quiz.state === QuizState.DRAFT) {
      if (!user || question.quiz.creatorId !== user.id) {
        return NextResponse.json(
          { error: 'You do not have permission to view this question' },
          { status: 403 }
        )
      }
    }

    // Check editability
    const editability = await checkQuestionEditability(questionId)

    return NextResponse.json(
      {
        question: {
          ...question,
          editable: editability.editable,
          editabilityReason: editability.reason,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get question error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


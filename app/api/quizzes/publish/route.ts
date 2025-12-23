import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { QuizState } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {

    const user = await requireAuth(request)
    const body = await request.json()
    const { quizId } = body

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      )
    }

    // Get quiz and verify user is creator
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        creatorId: true,
        state: true,
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
        { error: 'You can only publish your own quizzes' },
        { status: 403 }
      )
    }

    if (quiz.state === QuizState.PUBLISHED) {
      return NextResponse.json(
        { error: 'Quiz is already published' },
        { status: 400 }
      )
    }

    // Publish quiz (change state to PUBLISHED)
    const publishedQuiz = await db.quiz.update({
      where: { id: quizId },
      data: {
        state: QuizState.PUBLISHED,
      },
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
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Quiz published successfully',
        quiz: publishedQuiz,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Publish quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


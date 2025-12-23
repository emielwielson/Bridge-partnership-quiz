import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { checkQuizEditability } from '@/lib/question-editability'

export async function PUT(request: NextRequest) {
  try {
export const dynamic = 'force-dynamic'

    const user = await requireAuth(request)
    const body = await request.json()
    const { quizId, title, description, topic } = body

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
        { error: 'You can only edit your own quizzes' },
        { status: 403 }
      )
    }

    // Check editability
    const editability = checkQuizEditability(quiz.state)

    // Build update data based on editability
    const updateData: {
      title?: string
      description?: string | null
      topic?: string
    } = {}

    if (editability.titleEditable && title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    } else if (title !== undefined) {
      return NextResponse.json(
        { error: 'Title cannot be edited for published quizzes' },
        { status: 400 }
      )
    }

    if (editability.descriptionEditable && description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (editability.topicEditable && topic !== undefined) {
      if (typeof topic !== 'string' || topic.trim().length === 0) {
        return NextResponse.json(
          { error: 'Topic cannot be empty' },
          { status: 400 }
        )
      }
      updateData.topic = topic.trim()
    } else if (topic !== undefined) {
      return NextResponse.json(
        { error: 'Topic cannot be edited for published quizzes' },
        { status: 400 }
      )
    }

    // Update quiz
    const updatedQuiz = await db.quiz.update({
      where: { id: quizId },
      data: updateData,
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
        message: 'Quiz updated successfully',
        quiz: updatedQuiz,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Update quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


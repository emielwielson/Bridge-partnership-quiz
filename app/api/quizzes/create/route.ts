import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth/middleware'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
import { QuizState } from '@prisma/client'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { title, description, topic } = body

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    // Create quiz with DRAFT state
    const quiz = await db.quiz.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        topic: topic.trim(),
        state: QuizState.DRAFT,
        creatorId: user.id,
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
        message: 'Quiz created successfully',
        quiz,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


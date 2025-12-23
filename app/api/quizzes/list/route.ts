import { NextRequest, NextResponse } from 'next/server'
import { optionalAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { QuizState } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await optionalAuth(request)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const topic = searchParams.get('topic') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // If user is authenticated, show their own quizzes (draft or published) and all published quizzes
    // If user is not authenticated, only show published quizzes
    if (user) {
      where.OR = [
        { creatorId: user.id }, // User's own quizzes
        { state: QuizState.PUBLISHED }, // Published quizzes
      ]
    } else {
      where.state = QuizState.PUBLISHED
    }

    // Add search filter
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      }
    }

    // Add topic filter
    if (topic) {
      where.topic = topic
    }

    // Get quizzes with pagination
    const [quizzes, total] = await Promise.all([
      db.quiz.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
      }),
      db.quiz.count({ where }),
    ])

    return NextResponse.json(
      {
        quizzes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List quizzes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


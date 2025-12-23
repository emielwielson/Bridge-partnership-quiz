import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/lib/auth/middleware'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const partnershipId = searchParams.get('partnershipId')
    const classId = searchParams.get('classId')
    const quizId = searchParams.get('quizId')
    const status = searchParams.get('status')

    // Build where clause
    const where: any = {
      userId: user.id,
    }

    if (partnershipId) {
      where.partnershipId = partnershipId
    }

    if (classId) {
      where.classId = classId
    }

    if (quizId) {
      where.quizId = quizId
    }

    if (status) {
      where.status = status
    }

    // Get attempts
    const attempts = await db.attempt.findMany({
      where,
      orderBy: {
        startedAt: 'desc',
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            topic: true,
            _count: {
              select: {
                questions: true,
              },
            },
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
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        attempts,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List attempts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


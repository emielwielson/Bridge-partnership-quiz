import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { ClassMemberRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {

    const user = await requireAuth(request)

    // Get all classes where user is a member
    const classMemberships = await db.classMember.findMany({
      where: {
        userId: user.id,
      },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                id: true,
                username: true,
              },
            },
            activeQuiz: {
              select: {
                id: true,
                title: true,
              },
            },
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
      },
      orderBy: {
        joinedAt: 'desc',
      },
    })

    // Separate into teacher and student classes
    const teacherClasses = classMemberships
      .filter((cm) => cm.role === ClassMemberRole.TEACHER)
      .map((cm) => ({
        ...cm.class,
        role: cm.role,
        joinedAt: cm.joinedAt,
      }))

    const studentClasses = classMemberships
      .filter((cm) => cm.role === ClassMemberRole.STUDENT)
      .map((cm) => ({
        ...cm.class,
        role: cm.role,
        joinedAt: cm.joinedAt,
      }))

    return NextResponse.json(
      {
        teacherClasses,
        studentClasses,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('List classes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


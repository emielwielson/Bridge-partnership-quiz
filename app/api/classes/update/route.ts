import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { ClassMemberRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { classId, name } = body

    if (!classId || !name) {
      return NextResponse.json(
        { error: 'Class ID and name are required' },
        { status: 400 }
      )
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Class name must be a non-empty string' },
        { status: 400 }
      )
    }

    // Verify user is a teacher of the class
    const classMember = await db.classMember.findUnique({
      where: {
        classId_userId: {
          classId,
          userId: user.id,
        },
      },
    })

    if (!classMember || classMember.role !== ClassMemberRole.TEACHER) {
      return NextResponse.json(
        { error: 'Only teachers can update class information' },
        { status: 403 }
      )
    }

    // Update class name
    const updatedClass = await db.class.update({
      where: { id: classId },
      data: {
        name: name.trim(),
      },
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
            description: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Class updated successfully',
        class: updatedClass,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Update class error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


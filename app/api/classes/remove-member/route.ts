import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { ClassMemberRole } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const memberUserId = searchParams.get('memberUserId')

    if (!classId || !memberUserId) {
      return NextResponse.json(
        { error: 'Class ID and member user ID are required' },
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
        { error: 'Only teachers can remove members' },
        { status: 403 }
      )
    }

    // Prevent removing the teacher
    const memberToRemove = await db.classMember.findUnique({
      where: {
        classId_userId: {
          classId,
          userId: memberUserId,
        },
      },
    })

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    if (memberToRemove.role === ClassMemberRole.TEACHER) {
      return NextResponse.json(
        { error: 'Cannot remove the teacher from the class' },
        { status: 400 }
      )
    }

    // Remove the member
    await db.classMember.delete({
      where: {
        classId_userId: {
          classId,
          userId: memberUserId,
        },
      },
    })

    // Fetch updated class data
    const updatedClass = await db.class.findUnique({
      where: { id: classId },
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
        message: 'Member removed successfully',
        class: updatedClass,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


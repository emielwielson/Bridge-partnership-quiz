import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { ClassMemberRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
export const dynamic = 'force-dynamic'

    const user = await requireAuth(request)
    const body = await request.json()
    const { classLink } = body

    if (!classLink || typeof classLink !== 'string') {
      return NextResponse.json(
        { error: 'Class link is required' },
        { status: 400 }
      )
    }

    // Find class by link
    const classData = await db.class.findUnique({
      where: { classLink: classLink.trim() },
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = await db.classMember.findUnique({
      where: {
        classId_userId: {
          classId: classData.id,
          userId: user.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this class' },
        { status: 400 }
      )
    }

    // Add user as student
    await db.classMember.create({
      data: {
        classId: classData.id,
        userId: user.id,
        role: ClassMemberRole.STUDENT,
      },
    })

    // Return class with members
    const updatedClass = await db.class.findUnique({
      where: { id: classData.id },
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
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Joined class successfully',
        class: updatedClass,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Join class error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


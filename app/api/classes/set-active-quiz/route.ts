import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { ClassMemberRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { classId, quizId } = body

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Validate user is teacher of the class
    const membership = await db.classMember.findUnique({
      where: {
        classId_userId: {
          classId,
          userId: user.id,
        },
      },
    })

    if (!membership || membership.role !== ClassMemberRole.TEACHER) {
      return NextResponse.json(
        { error: 'Only the teacher can set the active quiz for this class' },
        { status: 403 }
      )
    }

    // If quizId is provided, validate it exists
    if (quizId !== null && quizId !== undefined) {
      const quiz = await db.quiz.findUnique({
        where: { id: quizId },
      })

      if (!quiz) {
        return NextResponse.json(
          { error: 'Quiz not found' },
          { status: 404 }
        )
      }
    }

    // Update class with active quiz (or clear it if quizId is null)
    const updatedClass = await db.class.update({
      where: { id: classId },
      data: {
        activeQuizId: quizId || null,
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
        activeQuiz: quizId
          ? {
              select: {
                id: true,
                title: true,
                description: true,
              },
            }
          : undefined,
      },
    })

    return NextResponse.json(
      {
        message: quizId ? 'Active quiz set successfully' : 'Active quiz cleared successfully',
        class: updatedClass,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Set active quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


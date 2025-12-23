import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { ClassMemberRole, QuizState } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
export const dynamic = 'force-dynamic'

    const user = await requireAuth(request)
    const body = await request.json()
    const { classId, quizId } = body

    if (!classId || !quizId) {
      return NextResponse.json(
        { error: 'Class ID and Quiz ID are required' },
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
        { error: 'Only the teacher can start quizzes for this class' },
        { status: 403 }
      )
    }

    // Validate quiz exists and is published
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
    })

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    if (quiz.state !== QuizState.PUBLISHED) {
      return NextResponse.json(
        { error: 'Only published quizzes can be started for a class' },
        { status: 400 }
      )
    }

    // Update class with active quiz
    const updatedClass = await db.class.update({
      where: { id: classId },
      data: {
        activeQuizId: quizId,
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
        message: 'Quiz started for class successfully',
        class: updatedClass,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Start quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { AttemptStatus, QuizState } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { quizId, partnershipId, classId } = body

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      )
    }

    // Must provide either partnershipId or classId, but not both
    if (!partnershipId && !classId) {
      return NextResponse.json(
        { error: 'Either partnershipId or classId is required' },
        { status: 400 }
      )
    }

    if (partnershipId && classId) {
      return NextResponse.json(
        { error: 'Cannot provide both partnershipId and classId' },
        { status: 400 }
      )
    }

    // Verify quiz exists and is published (or user is creator)
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        state: true,
        creatorId: true,
        questions: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    // Draft quizzes cannot be taken by anyone
    if (quiz.state === QuizState.DRAFT) {
      return NextResponse.json(
        { error: 'This quiz is in draft mode and cannot be taken. Please publish the quiz first.' },
        { status: 403 }
      )
    }

    // Verify partnership exists and user is a member
    let partnership = null
    if (partnershipId) {
      partnership = await db.partnership.findUnique({
        where: { id: partnershipId },
        include: {
          members: {
            select: {
              userId: true,
            },
          },
        },
      })

      if (!partnership) {
        return NextResponse.json(
          { error: 'Partnership not found' },
          { status: 404 }
        )
      }

      const isMember = partnership.members.some((m) => m.userId === user.id)
      if (!isMember) {
        return NextResponse.json(
          { error: 'You are not a member of this partnership' },
          { status: 403 }
        )
      }
    }

    // Verify class exists and user is a member
    if (classId) {
      const classMember = await db.classMember.findUnique({
        where: {
          classId_userId: {
            classId,
            userId: user.id,
          },
        },
      })

      if (!classMember) {
        return NextResponse.json(
          { error: 'You are not a member of this class' },
          { status: 403 }
        )
      }
    }

    // Check if an IN_PROGRESS attempt already exists for this user, quiz, and partnership/class
    const existingAttempt = await db.attempt.findFirst({
      where: {
        quizId,
        userId: user.id,
        status: AttemptStatus.IN_PROGRESS,
        ...(partnershipId ? { partnershipId } : {}),
        ...(classId ? { classId } : {}),
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            questions: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                order: true,
              },
            },
          },
        },
      },
    })

    // If an existing attempt is found, return it
    if (existingAttempt) {
      return NextResponse.json(
        {
          message: 'Existing attempt found',
          attempt: existingAttempt,
        },
        { status: 200 }
      )
    }

    // For partnership quizzes, create attempts for all members
    if (partnershipId && partnership) {
      const memberIds = partnership.members.map((m) => m.userId)
      
      // Create attempts for all members who don't already have one
      const attemptsToCreate = []
      for (const memberId of memberIds) {
        const memberExistingAttempt = await db.attempt.findFirst({
          where: {
            quizId,
            userId: memberId,
            status: AttemptStatus.IN_PROGRESS,
            partnershipId,
          },
        })

        if (!memberExistingAttempt) {
          attemptsToCreate.push({
            quizId,
            partnershipId,
            userId: memberId,
            status: AttemptStatus.IN_PROGRESS,
          })
        }
      }

      // Create all attempts in parallel
      if (attemptsToCreate.length > 0) {
        await db.attempt.createMany({
          data: attemptsToCreate,
        })
      }

      // Fetch and return the current user's attempt
      const userAttempt = await db.attempt.findFirst({
        where: {
          quizId,
          userId: user.id,
          status: AttemptStatus.IN_PROGRESS,
          partnershipId,
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              questions: {
                orderBy: {
                  order: 'asc',
                },
                select: {
                  id: true,
                  order: true,
                },
              },
            },
          },
        },
      })

      if (!userAttempt) {
        return NextResponse.json(
          { error: 'Failed to create attempt' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          message: 'Attempts created successfully for all partnership members',
          attempt: userAttempt,
        },
        { status: 201 }
      )
    }

    // For class quizzes, create attempt only for the current user
    const attempt = await db.attempt.create({
      data: {
        quizId,
        partnershipId: partnershipId || null,
        classId: classId || null,
        userId: user.id,
        status: AttemptStatus.IN_PROGRESS,
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            questions: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                order: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Attempt created successfully',
        attempt,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create attempt error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


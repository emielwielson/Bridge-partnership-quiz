import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { AttemptStatus, QuizState, ClassMemberRole } from '@prisma/client'

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

    // If an existing attempt is found, return it (students can continue their attempts)
    if (existingAttempt) {
      return NextResponse.json(
        {
          message: 'Existing attempt found',
          attempt: existingAttempt,
        },
        { status: 200 }
      )
    }

    // Verify class exists and user is a teacher (only when creating NEW class attempts)
    let classData = null
    if (classId) {
      const classMember = await db.classMember.findUnique({
        where: {
          classId_userId: {
            classId,
            userId: user.id,
          },
        },
        include: {
          class: {
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
        },
      })

      if (!classMember) {
        return NextResponse.json(
          { error: 'You are not a member of this class' },
          { status: 403 }
        )
      }

      classData = classMember.class

      // Check if this quiz has already been completed by all original students
      // This prevents new members from joining completed quizzes
      // Check ALL attempts for this quiz/class (not just current students)
      const existingAttemptsForQuiz = await db.attempt.findMany({
        where: {
          quizId,
          classId,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
      })

      // If there are existing attempts, check if all original students have completed
      if (existingAttemptsForQuiz.length > 0) {
        // Group attempts by startedAt (within 1 second window) to identify attempt sets
        const attemptsBySet = new Map<string, typeof existingAttemptsForQuiz>()
        existingAttemptsForQuiz.forEach((attempt) => {
          // Round startedAt to nearest second for grouping
          const startedAtKey = Math.floor(attempt.startedAt.getTime() / 1000).toString()
          const existing = attemptsBySet.get(startedAtKey) || []
          existing.push(attempt)
          attemptsBySet.set(startedAtKey, existing)
        })

        // Check each attempt set to see if all students have completed
        let allSetsCompleted = true
        for (const [_, attemptSet] of attemptsBySet) {
          const allCompleted = attemptSet.every((a) => a.status === AttemptStatus.COMPLETED && a.completedAt !== null)
          if (!allCompleted) {
            allSetsCompleted = false
            break
          }
        }

        // If all attempt sets are completed, don't allow new attempts (unless user already has one)
        if (allSetsCompleted && !existingAttempt) {
          return NextResponse.json(
            {
              error: 'This quiz has already been completed by all class members. New members cannot join completed quizzes.',
            },
            { status: 403 }
          )
        }
      }

      // Only teachers can START new quizzes for classes (create attempts for all students)
      // Students can continue their own existing attempts (checked above)
      // Students can also join in-progress quizzes (if not completed, checked above)
      if (classMember.role !== ClassMemberRole.TEACHER && !existingAttempt && existingAttemptsForQuiz.length === 0) {
        // Student trying to start a brand new quiz - only teachers can do this
        return NextResponse.json(
          { error: 'Only teachers can start quizzes for classes' },
          { status: 403 }
        )
      }
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

    // For class quizzes, create attempts for all students (excluding teacher)
    if (classId && classData) {
      const studentIds = classData.members
        .filter((m) => m.role === ClassMemberRole.STUDENT)
        .map((m) => m.userId)

      // Check if this quiz has already been completed by all original students
      // Find all existing attempts for this quiz/class (not just current students)
      const existingAttempts = await db.attempt.findMany({
        where: {
          quizId,
          classId,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          startedAt: true,
          completedAt: true,
        },
      })

      // If there are existing attempts, check if all original students have completed
      if (existingAttempts.length > 0) {
        // Group attempts by startedAt (within 1 second window) to identify attempt sets
        const attemptsBySet = new Map<string, typeof existingAttempts>()
        existingAttempts.forEach((attempt) => {
          // Round startedAt to nearest second for grouping
          const startedAtKey = Math.floor(attempt.startedAt.getTime() / 1000).toString()
          const existing = attemptsBySet.get(startedAtKey) || []
          existing.push(attempt)
          attemptsBySet.set(startedAtKey, existing)
        })

        // Check each attempt set to see if all students have completed
        let allSetsCompleted = true
        for (const [_, attemptSet] of attemptsBySet) {
          const allCompleted = attemptSet.every((a) => a.status === AttemptStatus.COMPLETED && a.completedAt !== null)
          if (!allCompleted) {
            allSetsCompleted = false
            break
          }
        }

        // If all attempt sets are completed, don't create new attempts for new students
        if (allSetsCompleted) {
          // Check if the current user already has an attempt (they might be continuing)
          const userExistingAttempt = existingAttempts.find((a) => a.userId === user.id)
          if (userExistingAttempt) {
            // User already has an attempt, return it
            const userAttempt = await db.attempt.findUnique({
              where: { id: userExistingAttempt.id },
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
                message: 'Existing attempt found',
                attempt: userAttempt,
              },
              { status: 200 }
            )
          }

          // Quiz is completed, don't create new attempts
          return NextResponse.json(
            {
              error: 'This quiz has already been completed by all class members. New members cannot join completed quizzes.',
            },
            { status: 403 }
          )
        }
      }

      // Create attempts for all students who don't already have one
      const attemptsToCreate = []
      for (const studentId of studentIds) {
        const studentExistingAttempt = await db.attempt.findFirst({
          where: {
            quizId,
            userId: studentId,
            status: AttemptStatus.IN_PROGRESS,
            classId,
          },
        })

        if (!studentExistingAttempt) {
          attemptsToCreate.push({
            quizId,
            classId,
            userId: studentId,
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

      // Return success message (teacher doesn't get an attempt)
      return NextResponse.json(
        {
          message: `Quiz started for class. Attempts created for ${attemptsToCreate.length} student(s).`,
          classId,
          studentsCount: studentIds.length,
          attemptsCreated: attemptsToCreate.length,
        },
        { status: 201 }
      )
    }

    // This should not happen, but handle it just in case
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
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


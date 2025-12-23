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

    // For each class, if activeQuizId is not set, check for IN_PROGRESS attempts to determine active quiz
    const classesWithActiveQuiz = await Promise.all(
      classMemberships.map(async (cm) => {
        let activeQuiz = cm.class.activeQuiz

        // If activeQuizId is set, verify the quiz is not actually completed
        if (activeQuiz && cm.class.activeQuizId) {
          // Get all attempts for this quiz and class
          const attempts = await db.attempt.findMany({
            where: {
              classId: cm.class.id,
              quizId: cm.class.activeQuizId,
            },
            select: {
              id: true,
              userId: true,
              status: true,
              startedAt: true,
            },
          })

          // Group by attempt set (same startedAt time, within 1 second window)
          const attemptsBySet = new Map<string, typeof attempts>()
          attempts.forEach((a) => {
            const startedAtKey = Math.floor(a.startedAt.getTime() / 1000).toString()
            const existing = attemptsBySet.get(startedAtKey) || []
            existing.push(a)
            attemptsBySet.set(startedAtKey, existing)
          })

          // Get the most recent attempt set
          const mostRecentSet = Array.from(attemptsBySet.entries())
            .sort(([keyA, attemptsA], [keyB, attemptsB]) => {
              const dateA = attemptsA[0].startedAt.getTime()
              const dateB = attemptsB[0].startedAt.getTime()
              return dateB - dateA
            })[0]

          if (mostRecentSet) {
            const mostRecentAttempts = mostRecentSet[1]
            const studentsInSet = new Set(mostRecentAttempts.map((a) => a.userId))
            
            // Check if all students in this attempt set have completed
            const allStudentsCompleted = Array.from(studentsInSet).every((studentId) => {
              const studentAttempt = mostRecentAttempts.find((a) => a.userId === studentId)
              return studentAttempt?.status === 'COMPLETED'
            })

            // If all students completed, clear activeQuizId and don't show as active
            if (allStudentsCompleted) {
              await db.class.update({
                where: { id: cm.class.id },
                data: {
                  activeQuizId: null,
                },
              })
              activeQuiz = null
            }
          }
        }

        // If activeQuizId is not set, check for IN_PROGRESS attempts
        if (!activeQuiz && !cm.class.activeQuizId) {
          const inProgressAttempt = await db.attempt.findFirst({
            where: {
              classId: cm.class.id,
              status: 'IN_PROGRESS',
            },
            include: {
              quiz: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: {
              startedAt: 'desc',
            },
          })

          if (inProgressAttempt) {
            activeQuiz = inProgressAttempt.quiz
            // Optionally update the class to set activeQuizId for future queries
            await db.class.update({
              where: { id: cm.class.id },
              data: {
                activeQuizId: inProgressAttempt.quiz.id,
              },
            })
          }
        }

        return {
          ...cm.class,
          activeQuiz,
          role: cm.role,
          joinedAt: cm.joinedAt,
        }
      })
    )

    // Separate into teacher and student classes
    const teacherClasses = classesWithActiveQuiz
      .filter((c) => c.role === ClassMemberRole.TEACHER)

    const studentClasses = classesWithActiveQuiz
      .filter((c) => c.role === ClassMemberRole.STUDENT)

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


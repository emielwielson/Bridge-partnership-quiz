import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { ClassMemberRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
export const dynamic = 'force-dynamic'

    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const quizId = searchParams.get('quizId')

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
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
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!classMember || classMember.role !== ClassMemberRole.TEACHER) {
      return NextResponse.json(
        { error: 'You must be a teacher to view aggregate results' },
        { status: 403 }
      )
    }

    // Build where clause for attempts
    const attemptWhere: any = {
      classId,
    }

    if (quizId) {
      attemptWhere.quizId = quizId
    }

    // Get all attempts for this class
    const attempts = await db.attempt.findMany({
      where: attemptWhere,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            topic: true,
            questions: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                prompt: true,
                answerType: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    })

    // Group by quiz if no specific quiz requested
    if (!quizId) {
      const quizzesMap = new Map<string, typeof attempts>()
      attempts.forEach((attempt) => {
        const existing = quizzesMap.get(attempt.quizId) || []
        existing.push(attempt)
        quizzesMap.set(attempt.quizId, existing)
      })

      const quizSummaries = Array.from(quizzesMap.entries()).map(
        ([quizId, quizAttempts]) => {
          const quiz = quizAttempts[0].quiz
          const totalStudents = new Set(quizAttempts.map((a) => a.userId)).size
          const completedCount = quizAttempts.filter(
            (a) => a.status === 'COMPLETED'
          ).length

          return {
            quizId: quiz.id,
            quizTitle: quiz.title,
            quizTopic: quiz.topic,
            totalStudents,
            completedCount,
            totalAttempts: quizAttempts.length,
          }
        }
      )

      return NextResponse.json(
        {
          class: {
            id: classMember.class.id,
            name: classMember.class.name,
          },
          quizzes: quizSummaries,
        },
        { status: 200 }
      )
    }

    // Get specific quiz details
    const quiz = attempts[0]?.quiz
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found or no attempts found' },
        { status: 404 }
      )
    }

    // Calculate answer distribution for each question
    const questionDistributions = quiz.questions.map((question) => {
      // Get all answers for this question
      const questionAnswers = attempts.flatMap((attempt) =>
        attempt.answers
          .filter((a) => a.questionId === question.id)
          .map((a) => ({
            userId: attempt.userId,
            username: attempt.user.username,
            answerData: a.answerData,
          }))
      )

      // Group answers by their JSON representation
      const answerGroups = new Map<string, { answer: any; count: number; users: Array<{ userId: string; username: string }> }>()

      questionAnswers.forEach((qa) => {
        const key = JSON.stringify(qa.answerData)
        const existing = answerGroups.get(key)
        if (existing) {
          existing.count++
          if (!existing.users.find((u) => u.userId === qa.userId)) {
            existing.users.push({
              userId: qa.userId,
              username: qa.username,
            })
          }
        } else {
          answerGroups.set(key, {
            answer: qa.answerData,
            count: 1,
            users: [
              {
                userId: qa.userId,
                username: qa.username,
              },
            ],
          })
        }
      })

      const distribution = Array.from(answerGroups.values())
        .map((group) => ({
          answer: group.answer,
          count: group.count,
          percentage:
            questionAnswers.length > 0
              ? Math.round((group.count / questionAnswers.length) * 100)
              : 0,
          users: group.users,
        }))
        .sort((a, b) => b.count - a.count)

      return {
        questionId: question.id,
        prompt: question.prompt,
        answerType: question.answerType,
        totalAnswers: questionAnswers.length,
        distribution,
      }
    })

    // Calculate overall statistics
    const totalStudents = new Set(attempts.map((a) => a.userId)).size
    const completedAttempts = attempts.filter((a) => a.status === 'COMPLETED').length

    return NextResponse.json(
      {
        class: {
          id: classMember.class.id,
          name: classMember.class.name,
        },
        quiz: {
          id: quiz.id,
          title: quiz.title,
          topic: quiz.topic,
        },
        statistics: {
          totalStudents,
          totalAttempts: attempts.length,
          completedAttempts,
          completionRate:
            attempts.length > 0
              ? Math.round((completedAttempts / attempts.length) * 100)
              : 0,
        },
        questions: questionDistributions,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Class aggregate results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


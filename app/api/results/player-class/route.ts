import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {

  try {
    const user = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Verify user is a member of the class
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
              where: {
                role: 'STUDENT', // Only count students, not teachers
              },
              select: {
                userId: true,
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

    // Get all attempts (both IN_PROGRESS and COMPLETED) for all students in this class (excluding teacher)
    // This allows teachers to see quizzes that have been started even if not all students have completed
    const studentIds = classMember.class.members.map((m) => m.userId)
    const attempts = await db.attempt.findMany({
      where: {
        classId,
        userId: {
          in: studentIds,
        },
        // Include both IN_PROGRESS and COMPLETED attempts
        // Teachers should see quizzes that have been started
      },
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
                auction: {
                  include: {
                    bids: {
                      orderBy: {
                        sequence: 'asc',
                      },
                      include: {
                        alert: true,
                      },
                    },
                  },
                },
              },
            },
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
      orderBy: {
        startedAt: 'desc',
      },
    })

    // Group attempts by quiz
    const attemptsByQuiz = new Map<string, typeof attempts>()
    attempts.forEach((attempt) => {
      const existing = attemptsByQuiz.get(attempt.quizId) || []
      existing.push(attempt)
      attemptsByQuiz.set(attempt.quizId, existing)
    })

    // Build results for each quiz with answer percentages
    // Include quizzes where at least one student has started (even if not completed)
    const quizzes = Array.from(attemptsByQuiz.entries())
      .map(([quizId, quizAttempts]) => {
        const quiz = quizAttempts[0].quiz
        
        // Group attempts by attempt set (same startedAt time, within 1 second window)
        // This identifies the original students who participated when the quiz was started
        const attemptsBySet = new Map<string, typeof quizAttempts>()
        quizAttempts.forEach((attempt) => {
          const startedAtKey = Math.floor(attempt.startedAt.getTime() / 1000).toString()
          const existing = attemptsBySet.get(startedAtKey) || []
          existing.push(attempt)
          attemptsBySet.set(startedAtKey, existing)
        })

        // Get the most recent attempt set (the one we're showing results for)
        const mostRecentSet = Array.from(attemptsBySet.entries())
          .sort(([keyA, attemptsA], [keyB, attemptsB]) => {
            const dateA = attemptsA[0].startedAt.getTime()
            const dateB = attemptsB[0].startedAt.getTime()
            return dateB - dateA
          })[0]

        const mostRecentAttempts = mostRecentSet ? mostRecentSet[1] : quizAttempts
        
        // Calculate total students based on who actually participated in this attempt set
        // This locks the student count to those who were in the class when the quiz was started
        const totalStudents = new Set(mostRecentAttempts.map((a) => a.userId)).size
        
        // Separate completed and in-progress attempts from the most recent set
        const completedAttempts = mostRecentAttempts.filter((a) => a.status === 'COMPLETED')
        const studentsCompleted = completedAttempts.length
        
        // Collect all answers for each question from COMPLETED attempts only
        // (for answer percentages, we only want completed attempts)
        const answersByQuestion = new Map<string, any[]>()
        completedAttempts.forEach((attempt) => {
          attempt.answers.forEach((answer) => {
            const existing = answersByQuestion.get(answer.questionId) || []
            existing.push({
              userId: attempt.userId,
              answerData: answer.answerData,
            })
            answersByQuestion.set(answer.questionId, existing)
          })
        })

        // Calculate answer percentages for each question
        const questionResults = quiz.questions.map((question) => {
          const questionAnswers = answersByQuestion.get(question.id) || []
          const totalAnswers = questionAnswers.length
          
          // Count occurrences of each answer
          const answerCounts = new Map<string, number>()
          questionAnswers.forEach((qa) => {
            // Convert answer data to string for comparison
            const answerKey = JSON.stringify(qa.answerData)
            answerCounts.set(answerKey, (answerCounts.get(answerKey) || 0) + 1)
          })

          // Build answer distribution with percentages
          const answerDistribution = Array.from(answerCounts.entries()).map(([answerKey, count]) => ({
            answer: JSON.parse(answerKey),
            count,
            percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
          }))

          // Sort by count (descending)
          answerDistribution.sort((a, b) => b.count - a.count)

          return {
            questionId: question.id,
            prompt: question.prompt,
            answerType: question.answerType,
            auction: question.auction,
            totalAnswers,
            answerDistribution,
          }
        })

        // Get the most recent attempt date (completed or started)
        const mostRecentAttempt = mostRecentAttempts.sort((a, b) => {
          const dateA = (a.completedAt || a.startedAt).getTime()
          const dateB = (b.completedAt || b.startedAt).getTime()
          return dateB - dateA
        })[0]

        return {
          quizId,
          quizTitle: quiz.title,
          quizTopic: quiz.topic,
          completedAt: mostRecentAttempt.completedAt || mostRecentAttempt.startedAt,
          totalStudents,
          studentsCompleted,
          studentsStarted: new Set(mostRecentAttempts.map((a) => a.userId)).size,
          questions: questionResults,
        }
      })

    return NextResponse.json(
      {
        class: {
          id: classMember.class.id,
          name: classMember.class.name,
        },
        quizzes,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Player class results error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


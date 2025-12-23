import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { QuizState } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { quizId } = body

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      )
    }

    // Get original quiz with all related data
    const originalQuiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
          include: {
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
      // Note: answerOptions is a JSON field and will be included automatically
    })

    if (!originalQuiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    // Only published quizzes can be copied (or user's own quizzes)
    if (originalQuiz.state === QuizState.DRAFT && originalQuiz.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only copy published quizzes or your own quizzes' },
        { status: 403 }
      )
    }

    // Create new quiz with copied data in a transaction
    const copiedQuiz = await db.$transaction(async (tx) => {
      // Create new quiz (no attribution to original)
      const newQuiz = await tx.quiz.create({
        data: {
          title: `${originalQuiz.title} (Copy)`,
          description: originalQuiz.description,
          topic: originalQuiz.topic,
          state: QuizState.DRAFT, // Copied quiz is always DRAFT
          creatorId: user.id, // New creator
        },
      })

      // Copy all questions with auctions and bids
      for (const question of originalQuiz.questions) {
        // Create question with nested auction creation (using Prisma nested create)
        const newQuestion = await tx.question.create({
          data: {
            quizId: newQuiz.id,
            prompt: question.prompt,
            answerType: question.answerType,
            answerOptions: question.answerOptions ?? undefined, // Copy answer options
            order: question.order,
            auction: {
              create: {
                dealer: question.auction!.dealer,
                vulnerability: question.auction!.vulnerability,
                bids: {
                  create: question.auction!.bids.map(bid => ({
                    bidType: bid.bidType,
                    level: bid.level,
                    suit: bid.suit,
                    position: bid.position,
                    sequence: bid.sequence,
                  })),
                },
              },
            },
          },
          include: {
            auction: {
              include: {
                bids: true,
              },
            },
          },
        })

        // Copy alerts for each bid
        for (let i = 0; i < question.auction!.bids.length; i++) {
          const originalBid = question.auction!.bids[i]
          const newBid = newQuestion.auction!.bids[i]
          
          if (originalBid.alert && newBid) {
            await tx.alert.create({
              data: {
                bidId: newBid.id,
                meaning: originalBid.alert.meaning,
              },
            })
          }
        }
      }

      // Return new quiz with questions
      return await tx.quiz.findUnique({
        where: { id: newQuiz.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          questions: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      })
    })

    return NextResponse.json(
      {
        message: 'Quiz copied successfully',
        quiz: copiedQuiz,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Copy quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


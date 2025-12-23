import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { checkQuestionEditability } from '@/lib/question-editability'
import { validateAuction } from '@/lib/auction-validator'
import { validateAnswerType } from '@/lib/answer-type-validator'
import { Dealer, BidType, Suit, AnswerType } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { questionId, prompt, answerType, auction, answerOptions } = body


    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    // Get question and verify user is creator
    const question = await db.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          select: {
            creatorId: true,
            state: true,
          },
        },
        auction: {
          include: {
            bids: {
              orderBy: {
                sequence: 'asc',
              },
            },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    if (question.quiz.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit questions in your own quizzes' },
        { status: 403 }
      )
    }

    // Check editability
    const editability = await checkQuestionEditability(questionId)
    if (!editability.editable) {
      return NextResponse.json(
        {
          error: editability.reason || 'Question cannot be edited',
        },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: {
      prompt?: string
      answerType?: AnswerType
      answerOptions?: any
    } = {}

    if (prompt !== undefined) {
      if (typeof prompt !== 'string' || prompt.trim().length === 0) {
        return NextResponse.json(
          { error: 'Prompt cannot be empty' },
          { status: 400 }
        )
      }
      updateData.prompt = prompt.trim()
    }

    if (answerType !== undefined) {
      // Validate answer type against last bid
      const lastBid = question.auction?.bids[question.auction.bids.length - 1]
      if (!lastBid) {
        return NextResponse.json(
          { error: 'Cannot validate answer type: auction has no bids' },
          { status: 400 }
        )
      }

      const lastBidForValidation = {
        bidType: lastBid.bidType,
        level: lastBid.level ?? undefined,
        suit: lastBid.suit?.toString(),
      }

      const answerTypeValidation = validateAnswerType(
        answerType as AnswerType,
        lastBidForValidation
      )

      if (!answerTypeValidation.valid) {
        return NextResponse.json(
          {
            error: answerTypeValidation.error?.message || 'Answer type validation failed',
          },
          { status: 400 }
        )
      }

      updateData.answerType = answerType as AnswerType
    }

    if (answerOptions !== undefined) {
      // Validate answer options
      const newAnswerType = answerType !== undefined ? answerType as AnswerType : question.answerType
      if (newAnswerType === AnswerType.MULTIPLE_CHOICE || newAnswerType === AnswerType.DOUBLE_INTERPRETATION || newAnswerType === AnswerType.REDOUBLE_INTERPRETATION) {
        if (!Array.isArray(answerOptions) || answerOptions.length === 0) {
          return NextResponse.json(
            { error: 'Answer options are required for this answer type' },
            { status: 400 }
          )
        }
        if (newAnswerType === AnswerType.MULTIPLE_CHOICE && answerOptions.length < 2) {
          return NextResponse.json(
            { error: 'Multiple choice questions require at least 2 options' },
            { status: 400 }
          )
        }
        // Validate that all options are non-empty strings
        if (answerOptions.some((opt: any) => typeof opt !== 'string' || opt.trim().length === 0)) {
          return NextResponse.json(
            { error: 'All answer options must be non-empty strings' },
            { status: 400 }
          )
        }
        updateData.answerOptions = answerOptions
      } else {
        // Clear answer options for other answer types
        updateData.answerOptions = null
      }
    }

    // Update auction if provided
    if (auction) {
      const formattedBids = auction.bids.map((bid: any) => ({
        bidType: bid.bidType as BidType,
        level: bid.level,
        suit: bid.suit as Suit | undefined,
        position: bid.position,
        sequence: bid.sequence,
      }))

      const auctionValidation = validateAuction({
        dealer: auction.dealer as Dealer,
        vulnerability: auction.vulnerability,
        bids: formattedBids,
      })

      if (!auctionValidation.valid) {
        return NextResponse.json(
          {
            error: 'Auction validation failed',
            errors: auctionValidation.errors,
          },
          { status: 400 }
        )
      }

      // Update auction and bids in transaction
      await db.$transaction(async (tx) => {
        // Delete existing bids
        await tx.bid.deleteMany({
          where: { auctionId: question.auction!.id },
        })

        // Update auction
        await tx.auction.update({
          where: { id: question.auction!.id },
          data: {
            dealer: auction.dealer,
            vulnerability: auction.vulnerability,
          },
        })

        // Create new bids
        for (const bid of formattedBids) {
          await tx.bid.create({
            data: {
              auctionId: question.auction!.id,
              bidType: bid.bidType,
              level: bid.level,
              suit: bid.suit,
              position: bid.position,
              sequence: bid.sequence,
            },
          })
        }
      })
    }

    // Update question if there are changes
    let updatedQuestion = question
    if (Object.keys(updateData).length > 0) {
      updatedQuestion = await db.question.update({
        where: { id: questionId },
        data: updateData,
        include: {
          quiz: {
            select: {
              creatorId: true,
              state: true,
            },
          },
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
      })
    } else {
      // Reload with includes if no question update
      const reloadedQuestion = await db.question.findUnique({
        where: { id: questionId },
        include: {
          quiz: {
            select: {
              creatorId: true,
              state: true,
            },
          },
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
      })
      
      if (!reloadedQuestion) {
        return NextResponse.json(
          { error: 'Question not found after reload' },
          { status: 404 }
        )
      }
      
      updatedQuestion = reloadedQuestion
    }

    return NextResponse.json(
      {
        message: 'Question updated successfully',
        question: updatedQuestion,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Update question error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


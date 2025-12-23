import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { validateAuction } from '@/lib/auction-validator'
import { validateAnswerType } from '@/lib/answer-type-validator'
import { Dealer, BidType, Suit, Vulnerability, AnswerType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { quizId, auction, prompt, answerType, answerOptions } = body

    if (!quizId || !auction || !prompt || !answerType) {
      return NextResponse.json(
        { error: 'Quiz ID, auction, prompt, and answer type are required' },
        { status: 400 }
      )
    }

    // Validate answer options
    if (answerType === AnswerType.MULTIPLE_CHOICE || answerType === AnswerType.DOUBLE_INTERPRETATION) {
      if (!answerOptions || !Array.isArray(answerOptions) || answerOptions.length === 0) {
        return NextResponse.json(
          { error: 'Answer options are required for this answer type' },
          { status: 400 }
        )
      }
      if (answerType === AnswerType.MULTIPLE_CHOICE && answerOptions.length < 2) {
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
    }

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt cannot be empty' },
        { status: 400 }
      )
    }

    // Verify quiz exists and user is creator
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        creatorId: true,
        state: true,
      },
    })

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    if (quiz.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only add questions to your own quizzes' },
        { status: 403 }
      )
    }

    // Validate auction
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

    // Get last bid for answer type validation
    const lastBid = formattedBids[formattedBids.length - 1]
    if (!lastBid) {
      return NextResponse.json(
        { error: 'Auction must have at least one bid' },
        { status: 400 }
      )
    }

    const lastBidForValidation = {
      bidType: lastBid.bidType,
      level: lastBid.level,
      suit: lastBid.suit?.toString(),
    }

    // Validate answer type
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

    // Get next order number
    const lastQuestion = await db.question.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const nextOrder = (lastQuestion?.order ?? -1) + 1

    // Create question with auction in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create question with nested auction creation
      const questionData: any = {
        quizId,
        prompt: prompt.trim(),
        answerType: answerType as AnswerType,
        order: nextOrder,
        auction: {
            create: {
              dealer: auction.dealer as Dealer,
              vulnerability: auction.vulnerability as Vulnerability,
              bids: {
                create: formattedBids.map(bid => ({
                  bidType: bid.bidType,
                  level: bid.level,
                  suit: bid.suit,
                  position: bid.position,
                  sequence: bid.sequence,
                })),
              },
            },
          },
      }

      // Add answer options if provided
      if (answerOptions && Array.isArray(answerOptions) && answerOptions.length > 0) {
        questionData.answerOptions = answerOptions
      }

      const newQuestion = await tx.question.create({
        data: questionData,
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
      })

      // Return question with auction
      return await tx.question.findUnique({
        where: { id: newQuestion.id },
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
      })
    })

    return NextResponse.json(
      {
        message: 'Question created successfully',
        question: result,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create question error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


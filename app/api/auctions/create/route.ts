import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { validateAuction } from '@/lib/auction-validator'
import { Dealer, BidType, Suit, Vulnerability } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { questionId, dealer, vulnerability, bids } = body

    if (!questionId || !dealer || !vulnerability || !Array.isArray(bids)) {
      return NextResponse.json(
        { error: 'Question ID, dealer, vulnerability, and bids array are required' },
        { status: 400 }
      )
    }

    // Verify question exists and user has permission
    const question = await db.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          select: {
            creatorId: true,
            state: true,
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
        { error: 'You can only create auctions for your own quizzes' },
        { status: 403 }
      )
    }

    // Format bids for validation
    const formattedBids = bids.map((bid: any) => ({
      bidType: bid.bidType as BidType,
      level: bid.level,
      suit: bid.suit as Suit | undefined,
      position: bid.position,
      sequence: bid.sequence,
    }))

    // Validate auction
    const validation = validateAuction({
      dealer: dealer as Dealer,
      vulnerability,
      bids: formattedBids,
    })

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Auction validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      )
    }

    // Create auction with bids in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create auction
      const auction = await tx.auction.create({
        data: {
          questionId,
          dealer: dealer as Dealer,
          vulnerability: vulnerability as Vulnerability,
        },
      })

      // Create all bids
      const createdBids = []
      for (const bid of formattedBids) {
        const createdBid = await tx.bid.create({
          data: {
            auctionId: auction.id,
            bidType: bid.bidType,
            level: bid.level,
            suit: bid.suit,
            position: bid.position,
            sequence: bid.sequence,
          },
        })
        createdBids.push(createdBid)
      }

      // Return auction with bids
      return await tx.auction.findUnique({
        where: { id: auction.id },
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
      })
    })

    return NextResponse.json(
      {
        message: 'Auction created successfully',
        auction: result,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create auction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


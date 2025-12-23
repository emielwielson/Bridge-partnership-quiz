import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { BidType, Suit } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
export const dynamic = 'force-dynamic'

    const user = await requireAuth(request)
    const body = await request.json()
    const { auctionId, bidType, level, suit, position, sequence } = body

    if (!auctionId || !bidType || position === undefined || sequence === undefined) {
      return NextResponse.json(
        { error: 'Auction ID, bid type, position, and sequence are required' },
        { status: 400 }
      )
    }

    // Verify auction exists and user has permission
    const auction = await db.auction.findUnique({
      where: { id: auctionId },
      include: {
        question: {
          include: {
            quiz: {
              select: {
                creatorId: true,
              },
            },
          },
        },
      },
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    if (auction.question.quiz.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only add bids to your own quizzes' },
        { status: 403 }
      )
    }

    // Validate contract bid has level and suit
    if (bidType === BidType.CONTRACT) {
      if (level === undefined || level < 1 || level > 7) {
        return NextResponse.json(
          { error: 'Contract bid must have a valid level (1-7)' },
          { status: 400 }
        )
      }
      if (suit === undefined) {
        return NextResponse.json(
          { error: 'Contract bid must have a suit' },
          { status: 400 }
        )
      }
    }

    // Create bid
    const bid = await db.bid.create({
      data: {
        auctionId,
        bidType: bidType as BidType,
        level: bidType === BidType.CONTRACT ? level : null,
        suit: bidType === BidType.CONTRACT ? (suit as Suit) : null,
        position,
        sequence,
      },
      include: {
        alert: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Bid created successfully',
        bid,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create bid error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { validateAuction } from '@/lib/auction-validator'
import { Dealer, BidType, Suit } from '@prisma/client'

export async function POST(request: NextRequest) {
export const dynamic = 'force-dynamic'

  try {
    const body = await request.json()
    const { dealer, vulnerability, bids } = body

    if (!dealer || !vulnerability || !Array.isArray(bids)) {
      return NextResponse.json(
        { error: 'Dealer, vulnerability, and bids array are required' },
        { status: 400 }
      )
    }

    // Convert bids to proper format
    const formattedBids = bids.map((bid: any) => ({
      bidType: bid.bidType as BidType,
      level: bid.level,
      suit: bid.suit as Suit | undefined,
      position: bid.position,
      sequence: bid.sequence,
    }))

    // Validate auction
    const result = validateAuction({
      dealer: dealer as Dealer,
      vulnerability,
      bids: formattedBids,
    })

    return NextResponse.json(
      {
        valid: result.valid,
        errors: result.errors,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Validate auction error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


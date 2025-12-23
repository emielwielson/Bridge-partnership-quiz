import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()
    const { bidId, meaning } = body

    if (!bidId || !meaning) {
      return NextResponse.json(
        { error: 'Bid ID and meaning are required' },
        { status: 400 }
      )
    }

    if (typeof meaning !== 'string' || meaning.trim().length === 0) {
      return NextResponse.json(
        { error: 'Alert meaning cannot be empty' },
        { status: 400 }
      )
    }

    // Verify bid exists and user has permission
    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: {
        auction: {
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
        },
      },
    })

    if (!bid) {
      return NextResponse.json(
        { error: 'Bid not found' },
        { status: 404 }
      )
    }

    if (bid.auction.question.quiz.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only add alerts to your own quizzes' },
        { status: 403 }
      )
    }

    // Check if alert already exists
    const existingAlert = await db.alert.findUnique({
      where: { bidId },
    })

    let alert
    if (existingAlert) {
      // Update existing alert
      alert = await db.alert.update({
        where: { bidId },
        data: { meaning: meaning.trim() },
      })
    } else {
      // Create new alert
      alert = await db.alert.create({
        data: {
          bidId,
          meaning: meaning.trim(),
        },
      })
    }

    return NextResponse.json(
      {
        message: 'Alert created successfully',
        alert,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Create alert error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


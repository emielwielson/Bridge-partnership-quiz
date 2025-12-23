import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { generateQuizLink } from '@/lib/quiz-link'

export const dynamic = 'force-dynamic'

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

    // Get quiz and verify user is creator
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        creatorId: true,
        publicLink: true,
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
        { error: 'You can only share your own quizzes' },
        { status: 403 }
      )
    }

    // Generate public link if it doesn't exist
    let publicLink = quiz.publicLink
    if (!publicLink) {
      publicLink = await generateQuizLink()
      await db.quiz.update({
        where: { id: quizId },
        data: { publicLink },
      })
    }

    // Return shareable link
    const shareableUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/quizzes/${publicLink}`

    return NextResponse.json(
      {
        message: 'Shareable link generated',
        publicLink,
        shareableUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof NextResponse) {
      return error
    }
    console.error('Share quiz error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


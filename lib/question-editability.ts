import { db } from './db'
import { QuizState } from '@prisma/client'

export interface EditabilityResult {
  editable: boolean
  reason?: string
}

/**
 * Check if a question can be edited
 * Rules:
 * - Questions in draft quizzes: always editable
 * - Questions in published quizzes: editable until any player has answered
 * - Once any answer exists for a question, it becomes read-only
 */
export async function checkQuestionEditability(questionId: string): Promise<EditabilityResult> {
  const question = await db.question.findUnique({
    where: { id: questionId },
    include: {
      quiz: {
        select: {
          state: true,
        },
      },
      answers: {
        select: {
          id: true,
        },
        take: 1, // Only need to check if any answers exist
      },
    },
  })

  if (!question) {
    return {
      editable: false,
      reason: 'Question not found',
    }
  }

  // If quiz is in draft state, question is always editable
  if (question.quiz.state === QuizState.DRAFT) {
    return {
      editable: true,
    }
  }

  // If quiz is published, check if any answers exist
  if (question.answers.length > 0) {
    return {
      editable: false,
      reason: 'Question cannot be edited because it has been answered by at least one player',
    }
  }

  // Published quiz with no answers - editable
  return {
    editable: true,
  }
}

/**
 * Check if an auction can be edited
 * Same rules as question editability
 */
export async function checkAuctionEditability(auctionId: string): Promise<EditabilityResult> {
  const auction = await db.auction.findUnique({
    where: { id: auctionId },
    include: {
      question: {
        include: {
          quiz: {
            select: {
              state: true,
            },
          },
          answers: {
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
    },
  })

  if (!auction) {
    return {
      editable: false,
      reason: 'Auction not found',
    }
  }

  // Use the same logic as question editability
  if (auction.question.quiz.state === QuizState.DRAFT) {
    return {
      editable: true,
    }
  }

  if (auction.question.answers.length > 0) {
    return {
      editable: false,
      reason: 'Auction cannot be edited because the question has been answered by at least one player',
    }
  }

  return {
    editable: true,
  }
}

/**
 * Check if a quiz can be edited
 * Rules:
 * - Draft quizzes: fully editable
 * - Published quizzes: only description can be edited
 */
export function checkQuizEditability(quizState: QuizState): {
  titleEditable: boolean
  descriptionEditable: boolean
  topicEditable: boolean
} {
  if (quizState === QuizState.DRAFT) {
    return {
      titleEditable: true,
      descriptionEditable: true,
      topicEditable: true,
    }
  }

  // Published quizzes: only description can be edited
  return {
    titleEditable: false,
    descriptionEditable: true,
    topicEditable: false,
  }
}


import { AnswerType, BidType } from '@prisma/client'

export interface ValidationError {
  message: string
}

export interface ValidationResult {
  valid: boolean
  error?: ValidationError
}

/**
 * Get the last bid from an auction
 */
export interface LastBid {
  bidType: BidType
  level?: number
  suit?: string
}

/**
 * Validate answer type compatibility with last bid
 * Rules:
 * - Forcing/Non-forcing: only for contract bids or pass
 * - Double Interpretation: only for doubles
 * - Redouble Interpretation: only for redoubles
 * - Free Answer: available for any bid type
 * - Multiple Choice: available for any bid type
 */
export function validateAnswerType(
  answerType: AnswerType,
  lastBid: LastBid
): ValidationResult {
  switch (answerType) {
    case AnswerType.FORCING_NON_FORCING:
      // Only valid for contract bids or pass
      if (lastBid.bidType !== BidType.CONTRACT && lastBid.bidType !== BidType.PASS) {
        return {
          valid: false,
          error: {
            message: 'Forcing/Non-forcing answer type is only available for contract bids or pass',
          },
        }
      }
      return { valid: true }

    case AnswerType.DOUBLE_INTERPRETATION:
      // Only valid for doubles
      if (lastBid.bidType !== BidType.DOUBLE) {
        return {
          valid: false,
          error: {
            message: 'Double Interpretation answer type is only available when the last bid is a Double',
          },
        }
      }
      return { valid: true }

    case AnswerType.REDOUBLE_INTERPRETATION:
      // Only valid for redoubles
      if (lastBid.bidType !== BidType.REDOUBLE) {
        return {
          valid: false,
          error: {
            message: 'Redouble Interpretation answer type is only available when the last bid is a Redouble',
          },
        }
      }
      return { valid: true }

    case AnswerType.FREE_ANSWER:
      // Available for any bid type
      return { valid: true }

    case AnswerType.MULTIPLE_CHOICE:
      // Available for any bid type
      return { valid: true }

    default:
      return {
        valid: false,
        error: {
          message: `Unknown answer type: ${answerType}`,
        },
      }
  }
}

/**
 * Get available answer types for a given last bid
 */
export function getAvailableAnswerTypes(lastBid: LastBid): AnswerType[] {
  const available: AnswerType[] = []

  // Forcing/Non-forcing: only for contract bids or pass
  if (lastBid.bidType === BidType.CONTRACT || lastBid.bidType === BidType.PASS) {
    available.push(AnswerType.FORCING_NON_FORCING)
  }

  // Double Interpretation: only for doubles
  if (lastBid.bidType === BidType.DOUBLE) {
    available.push(AnswerType.DOUBLE_INTERPRETATION)
  }

  // Redouble Interpretation: only for redoubles
  if (lastBid.bidType === BidType.REDOUBLE) {
    available.push(AnswerType.REDOUBLE_INTERPRETATION)
  }

  // Free Answer and Multiple Choice: always available
  available.push(AnswerType.FREE_ANSWER)
  available.push(AnswerType.MULTIPLE_CHOICE)

  return available
}


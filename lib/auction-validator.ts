import { Dealer, BidType, Suit } from '@prisma/client'

export interface BidInput {
  bidType: BidType
  level?: number
  suit?: Suit
  position: string // 'N', 'E', 'S', 'W'
  sequence: number
}

export interface AuctionInput {
  dealer: Dealer
  vulnerability: string
  bids: BidInput[]
}

export interface ValidationError {
  message: string
  bidIndex?: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Get the next position in clockwise order
 */
function getNextPosition(position: string): string {
  const positions = ['N', 'E', 'S', 'W']
  const currentIndex = positions.indexOf(position)
  return positions[(currentIndex + 1) % 4]
}

/**
 * Get position by dealer and sequence
 */
function getPositionBySequence(dealer: Dealer, sequence: number): string {
  const positions = ['N', 'E', 'S', 'W']
  const dealerIndex = positions.indexOf(dealer)
  return positions[(dealerIndex + sequence) % 4]
}

/**
 * Calculate contract bid rank (higher number = higher rank)
 * NT > Spades > Hearts > Diamonds > Clubs
 */
function getContractRank(level: number, suit: Suit): number {
  const suitRanks: Record<Suit, number> = {
    CLUB: 1,
    DIAMOND: 2,
    HEART: 3,
    SPADE: 4,
    NO_TRUMP: 5,
  }
  return level * 10 + suitRanks[suit]
}

/**
 * Check if a double is legal (can only double opponent's contract bid)
 */
function isDoubleLegal(
  bids: BidInput[],
  currentBidIndex: number,
  currentPosition: string
): boolean {
  if (bids.length === 0) return false

  // Find the last contract bid
  let lastContractBidIndex = -1
  for (let i = currentBidIndex - 1; i >= 0; i--) {
    if (bids[i].bidType === BidType.CONTRACT) {
      lastContractBidIndex = i
      break
    }
  }

  if (lastContractBidIndex === -1) return false

  const lastContractBid = bids[lastContractBidIndex]
  const lastContractPosition = lastContractBid.position

  // Double is only legal if the last contract bid was from an opponent
  // Positions: N-S are partners, E-W are partners
  const isNS = currentPosition === 'N' || currentPosition === 'S'
  const isLastBidderNS = lastContractPosition === 'N' || lastContractPosition === 'S'

  return isNS !== isLastBidderNS
}

/**
 * Check if a redouble is legal (can only redouble after a double)
 */
function isRedoubleLegal(bids: BidInput[], currentBidIndex: number): boolean {
  if (bids.length === 0) return false

  // Find the last bid
  const lastBid = bids[currentBidIndex - 1]
  return lastBid.bidType === BidType.DOUBLE
}

/**
 * Validate auction bidding rules
 */
export function validateAuction(input: AuctionInput): ValidationResult {
  const errors: ValidationError[] = []
  const { dealer, bids } = input

  // Check if auction is empty
  if (bids.length === 0) {
    return { valid: true, errors: [] }
  }

  // Check for four passes at start (passed-out hand)
  if (bids.length === 4) {
    const allPasses = bids.every((bid) => bid.bidType === BidType.PASS)
    if (allPasses) {
      return { valid: true, errors: [] }
    }
  }

  // Validate each bid
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i]
    const expectedPosition = getPositionBySequence(dealer, i)

    // Check position is correct
    if (bid.position !== expectedPosition) {
      errors.push({
        message: `Bid ${i + 1} must be from position ${expectedPosition}, but got ${bid.position}`,
        bidIndex: i,
      })
    }

    // Check sequence is correct
    if (bid.sequence !== i) {
      errors.push({
        message: `Bid ${i + 1} has incorrect sequence number (expected ${i}, got ${bid.sequence})`,
        bidIndex: i,
      })
    }

    // Validate bid type specific rules
    switch (bid.bidType) {
      case BidType.PASS:
        // Pass is always legal
        break

      case BidType.DOUBLE:
        if (!isDoubleLegal(bids, i, bid.position)) {
          errors.push({
            message: `Double is not legal at position ${i + 1}. Can only double opponent's contract bid.`,
            bidIndex: i,
          })
        }
        break

      case BidType.REDOUBLE:
        if (!isRedoubleLegal(bids, i)) {
          errors.push({
            message: `Redouble is not legal at position ${i + 1}. Can only redouble after a double.`,
            bidIndex: i,
          })
        }
        break

      case BidType.CONTRACT:
        // Validate contract bid has level and suit
        if (bid.level === undefined || bid.level < 1 || bid.level > 7) {
          errors.push({
            message: `Contract bid at position ${i + 1} must have a valid level (1-7)`,
            bidIndex: i,
          })
        }
        if (bid.suit === undefined) {
          errors.push({
            message: `Contract bid at position ${i + 1} must have a suit`,
            bidIndex: i,
          })
        }

        // Check if contract bid outranks previous contract bid
        if (bid.level !== undefined && bid.suit !== undefined) {
          const currentRank = getContractRank(bid.level, bid.suit)

          // Find the last contract bid
          for (let j = i - 1; j >= 0; j--) {
            if (bids[j].bidType === BidType.CONTRACT) {
              const lastLevel = bids[j].level!
              const lastSuit = bids[j].suit!
              const lastRank = getContractRank(lastLevel, lastSuit)

              if (currentRank <= lastRank) {
                errors.push({
                  message: `Contract bid ${bid.level}${bid.suit} at position ${i + 1} does not outrank previous contract bid ${lastLevel}${lastSuit}`,
                  bidIndex: i,
                })
              }
              break
            }
          }
        }
        break
    }
  }

  // Check for three consecutive passes after a contract bid
  if (bids.length >= 3) {
    // Find if there was a contract bid before the last three bids
    let contractBidFound = false
    for (let i = bids.length - 4; i >= 0; i--) {
      if (bids[i].bidType === BidType.CONTRACT) {
        contractBidFound = true
        break
      }
    }

    if (contractBidFound) {
      const lastThree = bids.slice(-3)
      const allPasses = lastThree.every((bid) => bid.bidType === BidType.PASS)

      if (allPasses) {
        // Auction should have ended, but there might be more bids
        if (bids.length > 3) {
          errors.push({
            message: 'Auction should have ended after three consecutive passes following a contract bid',
            bidIndex: bids.length - 1,
          })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}


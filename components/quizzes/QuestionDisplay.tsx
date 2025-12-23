'use client'

import { Dealer, Vulnerability, BidType, Suit } from '@prisma/client'
import { useState } from 'react'

interface Bid {
  bidType: BidType
  level?: number
  suit?: Suit
  position: string
  sequence: number
  alert?: {
    meaning: string
  }
}

interface Auction {
  dealer: Dealer
  vulnerability: Vulnerability
  bids: Bid[]
}

interface QuestionDisplayProps {
  auction: Auction
  prompt: string
  questionOrder: number
  totalQuestions: number
}

export default function QuestionDisplay({
  auction,
  prompt,
  questionOrder,
  totalQuestions,
}: QuestionDisplayProps) {
  const [hoveredBidId, setHoveredBidId] = useState<string | null>(null)

  const suitSymbols: Record<Suit, string> = {
    CLUB: '♣',
    DIAMOND: '♦',
    HEART: '♥',
    SPADE: '♠',
    NO_TRUMP: 'NT',
  }

  const isVulnerable = (position: string): boolean => {
    switch (auction.vulnerability) {
      case Vulnerability.NONE:
        return false
      case Vulnerability.NS:
        return position === 'N' || position === 'S'
      case Vulnerability.EW:
        return position === 'E' || position === 'W'
      case Vulnerability.ALL:
        return true
      default:
        return false
    }
  }

  // Get the last bid (the one the question refers to)
  const lastBid = auction.bids.length > 0 ? auction.bids[auction.bids.length - 1] : null

  // Organize bids by position for display
  const bidsByPosition: Record<string, Bid[]> = {
    N: [],
    E: [],
    S: [],
    W: [],
  }

  auction.bids.forEach((bid) => {
    bidsByPosition[bid.position].push(bid)
  })

  const formatBid = (bid: Bid): string => {
    if (bid.bidType === BidType.CONTRACT) {
      return `${bid.level}${suitSymbols[bid.suit!]}`
    } else if (bid.bidType === BidType.PASS) {
      return 'Pass'
    } else if (bid.bidType === BidType.DOUBLE) {
      return 'X'
    } else if (bid.bidType === BidType.REDOUBLE) {
      return 'XX'
    }
    return bid.bidType
  }

  return (
    <div style={{ marginBottom: '2rem', width: '100%', maxWidth: '100%' }}>
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: '#666' }}>
          Question {questionOrder + 1} of {totalQuestions}
        </span>
      </div>

      {/* Auction Display */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            maxWidth: '600px',
            margin: '0 auto 0.5rem',
          }}
        >
          {['N', 'E', 'S', 'W'].map((pos) => (
            <div
              key={pos}
              style={{
                padding: '0.75rem',
                backgroundColor: isVulnerable(pos) ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              {pos}
            </div>
          ))}
        </div>

        {/* Bidding Rows */}
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {Array.from({ length: Math.max(...Object.values(bidsByPosition).map(b => b.length)) }, (_, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}
            >
              {['N', 'E', 'S', 'W'].map((pos) => {
                const bid = bidsByPosition[pos][rowIndex]
                const isLastBid = lastBid && bid && bid.sequence === lastBid.sequence
                
                return (
                  <div
                    key={pos}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: isLastBid ? '#ffeb3b' : '#fff',
                      border: isLastBid ? '3px solid #f57f17' : '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: isLastBid ? 'bold' : 'normal',
                      position: 'relative',
                    }}
                  >
                    {bid ? (
                      <>
                        <div
                          style={{ position: 'relative', display: 'inline-block' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (bid.alert) {
                              const bidId = `${bid.sequence}-${pos}`
                              setHoveredBidId(hoveredBidId === bidId ? null : bidId)
                            }
                          }}
                        >
                          {formatBid(bid)}
                          {bid.alert && (
                            <>
                              <span
                                style={{
                                  display: 'inline-block',
                                  fontSize: '0.7rem',
                                  color: '#d32f2f',
                                  marginLeft: '0.25rem',
                                  cursor: 'pointer',
                                }}
                              >
                                ⚠
                              </span>
                              {hoveredBidId === `${bid.sequence}-${pos}` && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    marginBottom: '0.5rem',
                                    padding: '0.5rem 0.75rem',
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontSize: '0.85rem',
                                    zIndex: 1000,
                                    maxWidth: '300px',
                                    whiteSpace: 'normal',
                                    textAlign: 'left',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Alert Meaning:</div>
                                  {bid.alert.meaning}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      border: '5px solid transparent',
                                      borderTopColor: '#333',
                                    }}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      ''
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

      </div>

      {/* Question Prompt */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '1.1rem',
          lineHeight: '1.6',
        }}
      >
        {prompt}
      </div>
    </div>
  )
}


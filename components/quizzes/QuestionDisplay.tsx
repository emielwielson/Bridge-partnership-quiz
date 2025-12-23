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

  // Get card color for suit
  const getSuitColor = (suit: Suit): string => {
    switch (suit) {
      case Suit.CLUB:
        return '#22c55e' // green
      case Suit.DIAMOND:
        return '#f97316' // orange
      case Suit.HEART:
        return '#ef4444' // red
      case Suit.SPADE:
        return '#1e40af' // dark blue
      case Suit.NO_TRUMP:
        return '#000000' // black
      default:
        return '#000000'
    }
  }

  // Get rotation angle for position
  const getRotation = (position: string): string => {
    switch (position) {
      case 'N': return '0deg'
      case 'E': return '90deg'
      case 'S': return '180deg'
      case 'W': return '270deg'
      default: return '0deg'
    }
  }

  // Get card style for a bid (all cards use North's layout, rotated)
  const getBidCardStyle = (bid: Bid, index: number, totalBids: number, position: string): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: '#fff',
      border: bid.alert ? '2px solid #f90' : '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
      position: 'relative',
      zIndex: index + 1, // First card on bottom (lower z-index)
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '0.5rem',
      transform: `rotate(${getRotation(position)})`,
      transformOrigin: 'center',
    }

    if (bid.bidType === BidType.CONTRACT && bid.suit) {
      return {
        ...baseStyle,
        width: '80px',
        height: '50px',
        color: getSuitColor(bid.suit),
        fontWeight: 'bold',
      }
    } else if (bid.bidType === BidType.DOUBLE) {
      return {
        ...baseStyle,
        width: '50px',
        height: '50px',
        backgroundColor: '#ef4444', // red
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1.1rem',
      }
    } else if (bid.bidType === BidType.REDOUBLE) {
      return {
        ...baseStyle,
        width: '50px',
        height: '50px',
        backgroundColor: '#1e40af', // dark blue
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '0.9rem',
      }
    } else if (bid.bidType === BidType.PASS) {
      return {
        ...baseStyle,
        width: '80px',
        height: '50px',
        backgroundColor: '#22c55e', // green
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '0.85rem',
        textAlign: 'left',
        padding: '0.5rem',
      }
    }

    return baseStyle
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
        {/* Bridge Table Layout with Stacked Cards */}
        <div style={{
          position: 'relative',
          width: '400px',
          height: '400px',
          margin: '0 auto',
          border: '3px solid #333',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
        }}>
          {/* Position Headers */}
          {['N', 'E', 'S', 'W'].map((pos) => {
            let headerStyle: React.CSSProperties = {}
            if (pos === 'N') {
              headerStyle = {
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable(pos) ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }
            } else if (pos === 'E') {
              headerStyle = {
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable(pos) ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }
            } else if (pos === 'S') {
              headerStyle = {
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable(pos) ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }
            } else if (pos === 'W') {
              headerStyle = {
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable(pos) ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }
            }

            return (
              <div key={pos} style={headerStyle}>
                {pos}{auction.dealer === pos && ' (D)'}
              </div>
            )
          })}

          {/* Stacked Bidding Cards */}
          {['N', 'E', 'S', 'W'].map((pos) => {
            const positionBids = bidsByPosition[pos]
            let positionStyle: React.CSSProperties = {}
            
            if (pos === 'N') {
              positionStyle = {
                position: 'absolute',
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
              }
            } else if (pos === 'E') {
              positionStyle = {
                position: 'absolute',
                right: '100px',
                top: '50%',
                transform: 'translateY(-50%)',
              }
            } else if (pos === 'S') {
              positionStyle = {
                position: 'absolute',
                bottom: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
              }
            } else if (pos === 'W') {
              positionStyle = {
                position: 'absolute',
                left: '100px',
                top: '50%',
                transform: 'translateY(-50%)',
              }
            }

            // Stacking direction based on position
            let flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse' = 'row'
            const overlap = 60 // Most of card hidden, only edge visible
            
            if (pos === 'N') {
              // North: stack left to right, overlap from left
              flexDirection = 'row'
            } else if (pos === 'E') {
              // East: stack top to bottom, overlap from top
              flexDirection = 'column'
            } else if (pos === 'S') {
              // South: stack right to left, overlap from right
              flexDirection = 'row-reverse'
            } else if (pos === 'W') {
              // West: stack bottom to top, overlap from bottom
              flexDirection = 'column-reverse'
            }
            
            return (
              <div
                key={pos}
                style={{
                  ...positionStyle,
                  display: 'flex',
                  flexDirection,
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: '0',
                }}
              >
                {positionBids.map((bid, idx) => {
                  const cardStyle = getBidCardStyle(bid, idx, positionBids.length, pos)
                  const isLastBid = lastBid && bid.sequence === lastBid.sequence
                  
                  // Calculate offset based on position
                  // Cards overlap so only the edge with the symbol is visible
                  let cardOffsetStyle: React.CSSProperties = {}
                  const cardHeight = 50 // Height of the card (for East/West)
                  const cardWidth = 80 // Width of the card (for North/South)
                  if (pos === 'N') {
                    // North: stack left to right, second card further right than first
                    // Use more negative margin to create more overlap (move second card more to the left)
                    // Increased slightly from -35 to -38 for a tiny bit more overlap
                    cardOffsetStyle = { marginLeft: idx > 0 ? `${cardHeight - overlap - 38}px` : '0' }
                  } else if (pos === 'E') {
                    // East: stack top to bottom, second card lower than first
                    // With column direction, cards flow down naturally
                    // Pull second card up by (cardHeight - overlap - 11) to make it appear higher
                    // while maintaining overlap
                    cardOffsetStyle = { marginTop: idx > 0 ? `${cardHeight - overlap - 11}px` : '0' }
                  } else if (pos === 'S') {
                    // South: stack right to left, second card further left than first
                    // Use same settings as North for consistent overlap
                    cardOffsetStyle = { marginRight: idx > 0 ? `${cardHeight - overlap - 38}px` : '0' }
                  } else if (pos === 'W') {
                    // West: stack bottom to top, second card higher than first
                    // With column-reverse direction, cards flow up naturally
                    // Push second card up by (cardHeight - overlap - 11) to make it appear higher
                    // while maintaining overlap (same as East but opposite direction)
                    cardOffsetStyle = { marginBottom: idx > 0 ? `${cardHeight - overlap - 11}px` : '0' }
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        ...cardOffsetStyle,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (bid.alert) {
                          const bidId = `${bid.sequence}-${pos}`
                          setHoveredBidId(hoveredBidId === bidId ? null : bidId)
                        }
                      }}
                    >
                      <div
                        style={{
                          ...cardStyle,
                          border: isLastBid ? '3px solid #f57f17' : cardStyle.border,
                          boxShadow: isLastBid
                            ? '0 4px 8px rgba(245, 127, 23, 0.4), 0 2px 4px rgba(0,0,0,0.2)'
                            : cardStyle.boxShadow,
                        }}
                      >
                        {bid.bidType === BidType.CONTRACT && bid.suit && (
                          <>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'center',
                              paddingLeft: '0px',
                            }}>
                              <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: 'bold',
                                lineHeight: '1',
                                marginBottom: '0.2rem',
                                textAlign: 'center',
                                width: '100%',
                              }}>
                                {bid.level}
                              </div>
                              <div style={{ 
                                fontSize: bid.suit === Suit.NO_TRUMP ? '0.9rem' : '1.2rem', 
                                fontWeight: 'bold',
                                lineHeight: '1',
                                textAlign: 'center',
                                width: '100%',
                              }}>
                                {suitSymbols[bid.suit]}
                              </div>
                            </div>
                            {bid.alert && (
                              <div style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                fontSize: '0.7rem',
                                color: '#f90',
                                cursor: 'pointer',
                              }}>
                                ⚠
                              </div>
                            )}
                          </>
                        )}
                        {bid.bidType === BidType.DOUBLE && (
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>X</div>
                        )}
                        {bid.bidType === BidType.REDOUBLE && (
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>XX</div>
                        )}
                        {bid.bidType === BidType.PASS && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                            paddingLeft: '0px',
                            marginTop: '-4px',
                          }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>P</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>A</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>S</div>
                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', lineHeight: '1' }}>S</div>
                          </div>
                        )}
                      </div>
                      {bid.alert && hoveredBidId === `${bid.sequence}-${pos}` && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: pos === 'N' ? '100%' : 'auto',
                            top: pos === 'S' ? '100%' : 'auto',
                            left: pos === 'W' ? '100%' : pos === 'E' ? 'auto' : '50%',
                            right: pos === 'E' ? '100%' : 'auto',
                            transform: pos === 'N' || pos === 'S' ? 'translateX(-50%)' : 'none',
                            marginBottom: pos === 'N' ? '0.5rem' : '0',
                            marginTop: pos === 'S' ? '0.5rem' : '0',
                            marginLeft: pos === 'W' ? '0.5rem' : '0',
                            marginRight: pos === 'E' ? '0.5rem' : '0',
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
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
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


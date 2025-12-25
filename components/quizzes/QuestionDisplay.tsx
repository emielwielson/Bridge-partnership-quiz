'use client'

import { Dealer, Vulnerability, BidType, Suit } from '@prisma/client'
import { useState, useEffect } from 'react'

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
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
        width: '80px',
        height: '50px',
        backgroundColor: '#ef4444', // red
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '1.1rem',
      }
    } else if (bid.bidType === BidType.REDOUBLE) {
      return {
        ...baseStyle,
        width: '80px',
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

  // Organize bids into rounds for mobile table view
  // Each round has 4 bids in order: N, E, S, W (starting from dealer)
  const getBiddingRounds = (): Array<Array<Bid | null>> => {
    const rounds: Array<Array<Bid | null>> = []
    const positions = ['N', 'E', 'S', 'W']
    const dealerIndex = positions.indexOf(auction.dealer)
    
    // Create a map of sequence to bid
    const bidMap = new Map<number, Bid>()
    auction.bids.forEach(bid => {
      bidMap.set(bid.sequence, bid)
    })
    
    if (auction.bids.length === 0) return rounds
    
    // Calculate number of rounds needed
    const totalRounds = Math.ceil(auction.bids.length / 4)
    
    for (let round = 0; round < totalRounds; round++) {
      const roundBids: Array<Bid | null> = []
      for (let posOffset = 0; posOffset < 4; posOffset++) {
        const sequence = round * 4 + posOffset
        const positionIndex = (dealerIndex + posOffset) % 4
        const position = positions[positionIndex]
        
        // Find bid at this sequence
        const bid = bidMap.get(sequence)
        if (bid) {
          roundBids.push(bid)
        } else {
          roundBids.push(null)
        }
      }
      rounds.push(roundBids)
    }
    
    return rounds
  }

  const biddingRounds = getBiddingRounds()

  // Get bid cell style for mobile table
  const getMobileBidCellStyle = (bid: Bid | null, isLastBid: boolean): React.CSSProperties => {
    if (!bid) {
      return {
        padding: '0.5rem',
        textAlign: 'center',
        border: '1px solid #ddd',
        backgroundColor: '#f9f9f9',
      }
    }

    const baseStyle: React.CSSProperties = {
      padding: '0.5rem',
      textAlign: 'center',
      border: isLastBid ? '2px solid #f57f17' : '1px solid #ddd',
      borderRadius: '4px',
      fontWeight: 'bold',
      fontSize: '0.9rem',
    }

    if (bid.bidType === BidType.CONTRACT && bid.suit) {
      return {
        ...baseStyle,
        color: getSuitColor(bid.suit),
        backgroundColor: '#fff',
      }
    } else if (bid.bidType === BidType.DOUBLE) {
      return {
        ...baseStyle,
        backgroundColor: '#ef4444',
        color: '#fff',
      }
    } else if (bid.bidType === BidType.REDOUBLE) {
      return {
        ...baseStyle,
        backgroundColor: '#1e40af',
        color: '#fff',
      }
    } else if (bid.bidType === BidType.PASS) {
      return {
        ...baseStyle,
        backgroundColor: '#22c55e',
        color: '#fff',
      }
    }

    return baseStyle
  }

  return (
    <div style={{ marginBottom: '2rem', width: '100%', maxWidth: '100%' }} suppressHydrationWarning>
      <div style={{ marginBottom: '1rem', textAlign: 'center' }} suppressHydrationWarning>
        <span style={{ fontSize: '0.9rem', color: '#666' }} suppressHydrationWarning>
          Question {questionOrder + 1} of {totalQuestions}
        </span>
      </div>

      {/* Auction Display */}
      <div style={{ marginBottom: '1.5rem' }}>
        {mounted && isMobile ? (
          /* Mobile Table Layout */
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}>
              <thead>
                <tr>
                  {['N', 'E', 'S', 'W'].map((pos) => (
                    <th
                      key={pos}
                      style={{
                        padding: '0.75rem 0.5rem',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: isVulnerable(pos) ? '#fcc' : '#cfc',
                        border: '1px solid #333',
                        fontSize: '0.85rem',
                      }}
                    >
                      {pos}
                      {auction.dealer === pos && ' (D)'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {biddingRounds.map((round, roundIndex) => (
                  <tr key={roundIndex}>
                    {round.map((bid, colIndex) => {
                      const position = ['N', 'E', 'S', 'W'][colIndex]
                      const isLastBid = lastBid && bid && bid.sequence === lastBid.sequence
                      const cellStyle = getMobileBidCellStyle(bid, isLastBid || false)
                      
                      return (
                        <td
                          key={colIndex}
                          style={{
                            ...cellStyle,
                            position: 'relative',
                            cursor: bid?.alert ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (bid?.alert) {
                              const bidId = `${bid.sequence}-${position}`
                              setHoveredBidId(hoveredBidId === bidId ? null : bidId)
                            }
                          }}
                        >
                          {bid ? (
                            <>
                              {formatBid(bid)}
                              {bid.alert && (
                                <span style={{
                                  marginLeft: '0.25rem',
                                  fontSize: '0.7rem',
                                  color: '#f90',
                                }}>
                                  ⚠
                                </span>
                              )}
                            </>
                          ) : (
                            '-'
                          )}
                          {bid?.alert && hoveredBidId === `${bid.sequence}-${position}` && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                backgroundColor: '#333',
                                color: '#fff',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                zIndex: 1000,
                                maxWidth: '200px',
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
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Desktop Bridge Table Layout with Stacked Cards */
          <div 
            style={{
              position: 'relative',
              width: '400px',
              height: '400px',
              margin: '0 auto',
              border: '3px solid #333',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
            }}
            suppressHydrationWarning
          >
          {/* Center Compass */}
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90px',
              height: '90px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              border: '2px solid #333',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
            suppressHydrationWarning
          >
            {/* Compass directions */}
            <div style={{
              position: 'absolute',
              top: '6px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: isVulnerable('N') ? '#dc2626' : '#22c55e',
            }}>N</div>
            <div style={{
              position: 'absolute',
              right: '6px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: isVulnerable('E') ? '#dc2626' : '#22c55e',
            }}>E</div>
            <div style={{
              position: 'absolute',
              bottom: '6px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: isVulnerable('S') ? '#dc2626' : '#22c55e',
            }}>S</div>
            <div style={{
              position: 'absolute',
              left: '6px',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              color: isVulnerable('W') ? '#dc2626' : '#22c55e',
            }}>W</div>
            {/* Center dot */}
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#333',
              borderRadius: '50%',
            }}></div>
            {/* Dealer indicator */}
            {auction.dealer && (
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                fontSize: '0.75rem',
                color: '#666',
                fontWeight: 'bold',
              }}>
                Dealer: {auction.dealer}
              </div>
            )}
          </div>

          {/* Stacked Bidding Cards */}
          {['N', 'E', 'S', 'W'].map((pos) => {
            const positionBids = bidsByPosition[pos]
            
            // Container for all cards at this position
            let containerStyle: React.CSSProperties = {}
            
            // Place cards on the edges of the table for more space
            if (pos === 'N') {
              containerStyle = {
                position: 'absolute',
                top: '50px', // Move down from top edge
                left: '50%',
              }
            } else if (pos === 'E') {
              containerStyle = {
                position: 'absolute',
                right: '50px', // Move left from right edge
                top: '50%',
              }
            } else if (pos === 'S') {
              containerStyle = {
                position: 'absolute',
                bottom: '50px', // Move up from bottom edge
                left: '50%',
              }
            } else if (pos === 'W') {
              containerStyle = {
                position: 'absolute',
                left: '25px', // Keep good distance (user approved)
                top: '50%',
              }
            }
            
            return (
              <div
                key={pos}
                style={{
                  ...containerStyle,
                  position: 'absolute',
                }}
              >
                {positionBids.map((bid, idx) => {
                  const cardStyle = getBidCardStyle(bid, idx, positionBids.length, pos)
                  const isLastBid = lastBid && bid.sequence === lastBid.sequence
                  
                  // Card dimensions (before rotation)
                  const cardHeight = 50
                  const cardWidth = 80
                  const overlap = 60 // Most of card hidden, only edge visible
                  const stackOffset = 30 // Shift for stacking cards (larger = less overlap, more visible)
                  
                  // Calculate absolute position for each card
                  // Cards are rotated, so we need to account for that in positioning
                  let cardPositionStyle: React.CSSProperties = {}
                  
                  if (pos === 'N') {
                    // North: stack left to right from center, cards not rotated
                    // All cards start at same position (centered), then shift right by small amount
                    const firstCardX = -cardWidth / 2 // Center the first card horizontally
                    const cardX = firstCardX + idx * stackOffset
                    cardPositionStyle = {
                      position: 'absolute',
                      left: `${cardX}px`,
                      top: `${-cardHeight / 2}px`, // Center vertically
                    }
                  } else if (pos === 'E') {
                    // East: stack top to bottom from center, cards rotated 90deg
                    // When rotated 90deg, width becomes height and height becomes width
                    // All cards start at same position (centered), then shift down by small amount
                    const firstCardY = -cardWidth / 2 // Center the first card vertically (using width since rotated)
                    const cardY = firstCardY + idx * stackOffset
                    cardPositionStyle = {
                      position: 'absolute',
                      top: `${cardY}px`,
                      left: `${-cardHeight / 2}px`, // Center horizontally
                    }
                  } else if (pos === 'S') {
                    // South: stack right to left from center, cards rotated 180deg
                    // All cards start at same position (centered), then shift left by small amount
                    const firstCardX = -cardWidth / 2 // Center the first card horizontally
                    const cardX = firstCardX - idx * stackOffset
                    cardPositionStyle = {
                      position: 'absolute',
                      left: `${cardX}px`,
                      top: `${-cardHeight / 2}px`, // Center vertically
                    }
                  } else if (pos === 'W') {
                    // West: stack bottom to top from center, cards rotated 270deg
                    // When rotated 270deg, width becomes height and height becomes width
                    // All cards start at same position (centered), then shift up by small amount
                    const firstCardY = -cardWidth / 2 // Center the first card vertically (using width since rotated)
                    const cardY = firstCardY - idx * stackOffset
                    cardPositionStyle = {
                      position: 'absolute',
                      top: `${cardY}px`,
                      left: `${-cardHeight / 2}px`, // Center horizontally
                    }
                  }

                  return (
                    <div
                      key={idx}
                      style={cardPositionStyle}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (bid.alert) {
                          const bidId = `${bid.sequence}-${pos}`
                          setHoveredBidId(hoveredBidId === bidId ? null : bidId)
                        }
                      }}
                      suppressHydrationWarning
                    >
                      <div
                        style={{
                          ...cardStyle,
                          border: isLastBid ? '3px solid #f57f17' : cardStyle.border,
                          boxShadow: isLastBid
                            ? '0 4px 8px rgba(245, 127, 23, 0.4), 0 2px 4px rgba(0,0,0,0.2)'
                            : cardStyle.boxShadow,
                        }}
                        suppressHydrationWarning
                      >
                        {bid.bidType === BidType.CONTRACT && bid.suit && (
                          <>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-start',
                              paddingLeft: '0px',
                              marginTop: '-4px',
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
                          <>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-start',
                              paddingLeft: '0px',
                              marginTop: '-4px',
                            }}>
                              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', lineHeight: '1' }}>X</div>
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
                        {bid.bidType === BidType.REDOUBLE && (
                          <>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-start',
                              paddingLeft: '0px',
                              marginTop: '-4px',
                            }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', lineHeight: '1', marginBottom: '0.02rem' }}>X</div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', lineHeight: '1' }}>X</div>
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
                        {bid.bidType === BidType.PASS && (
                          <>
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
        )}

      </div>

      {/* Question Prompt */}
      {prompt && (
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
      )}
    </div>
  )
}


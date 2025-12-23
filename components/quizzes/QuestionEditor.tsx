'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Dealer, Vulnerability, BidType, Suit, AnswerType } from '@prisma/client'

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

export default function QuestionEditor() {
  const params = useParams()
  const router = useRouter()
  const quizId = params?.id as string
  const questionId = params?.questionId as string | undefined

  const [dealer, setDealer] = useState<Dealer>(Dealer.N)
  const [vulnerability, setVulnerability] = useState<Vulnerability>(Vulnerability.NONE)
  const [bids, setBids] = useState<Bid[]>([])
  const [prompt, setPrompt] = useState('')
  const [answerType, setAnswerType] = useState<AnswerType>(AnswerType.FORCING_NON_FORCING)
  const [answerOptions, setAnswerOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [editingAlert, setEditingAlert] = useState<number | null>(null)
  const [alertMeaning, setAlertMeaning] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  const positions = ['N', 'E', 'S', 'W']
  const dealers: Dealer[] = [Dealer.N, Dealer.E, Dealer.S, Dealer.W]
  const vulnerabilities: Vulnerability[] = [Vulnerability.NONE, Vulnerability.NS, Vulnerability.EW, Vulnerability.ALL]
  const suits: Suit[] = useMemo(() => [Suit.CLUB, Suit.DIAMOND, Suit.HEART, Suit.SPADE, Suit.NO_TRUMP], [])
  
  // Get available answer types based on last bid
  const getAvailableAnswerTypes = (): AnswerType[] => {
    if (bids.length === 0) {
      // No bids yet - show all except double interpretation
      return [
        AnswerType.FORCING_NON_FORCING,
        AnswerType.FREE_ANSWER,
        AnswerType.MULTIPLE_CHOICE,
      ]
    }
    
    const lastBid = bids[bids.length - 1]
    const available: AnswerType[] = []
    
    // Forcing/Non-forcing: only for contract bids or pass
    if (lastBid.bidType === BidType.CONTRACT || lastBid.bidType === BidType.PASS) {
      available.push(AnswerType.FORCING_NON_FORCING)
    }
    
    // Double Interpretation: only for doubles
    if (lastBid.bidType === BidType.DOUBLE) {
      available.push(AnswerType.DOUBLE_INTERPRETATION)
    }
    
    // Free Answer and Multiple Choice: always available
    available.push(AnswerType.FREE_ANSWER)
    available.push(AnswerType.MULTIPLE_CHOICE)
    
    return available
  }
  
  const availableAnswerTypes = getAvailableAnswerTypes()

  const fetchQuestion = useCallback(async () => {
    if (!questionId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/questions/get?id=${questionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch question')
      }
      const data = await response.json()
      const question = data.question

      // Set basic question data
      setPrompt(question.prompt)
      setAnswerType(question.answerType)
      
      // Set answer options if they exist
      if (question.answerOptions && Array.isArray(question.answerOptions)) {
        setAnswerOptions(question.answerOptions)
      } else if (question.answerType === AnswerType.DOUBLE_INTERPRETATION && (!question.answerOptions || !Array.isArray(question.answerOptions))) {
        // Default options for double interpretation
        setAnswerOptions(['Penalty', 'Take-out', 'Values'])
      } else {
        setAnswerOptions([])
      }

      // Set auction data
      if (question.auction) {
        setDealer(question.auction.dealer)
        setVulnerability(question.auction.vulnerability)
        
        // Convert database bids to local Bid format
        const auctionBids = question.auction.bids
          .sort((a: Bid, b: Bid) => a.sequence - b.sequence)
          .map((bid: any) => ({
            ...bid,
            alert: bid.alert || undefined,
          }))
        setBids(auctionBids)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question')
    } finally {
      setLoading(false)
    }
  }, [questionId])

  useEffect(() => {
    if (questionId) {
      fetchQuestion()
    }
  }, [questionId, fetchQuestion])

  // Generate default prompt based on last bid
  const generateDefaultPrompt = (): string => {
    if (bids.length === 0) {
      return ''
    }
    
    const lastBid = bids[bids.length - 1]
    const suitSymbols: Record<Suit, string> = {
      CLUB: '♣',
      DIAMOND: '♦',
      HEART: '♥',
      SPADE: '♠',
      NO_TRUMP: 'NT',
    }
    
    let bidText = ''
    if (lastBid.bidType === BidType.CONTRACT) {
      bidText = `${lastBid.level}${suitSymbols[lastBid.suit!]}`
    } else if (lastBid.bidType === BidType.PASS) {
      bidText = 'Pass'
    } else if (lastBid.bidType === BidType.DOUBLE) {
      bidText = 'X'
    } else if (lastBid.bidType === BidType.REDOUBLE) {
      bidText = 'XX'
    } else {
      bidText = lastBid.bidType
    }
    
    return `What does ${bidText} by ${lastBid.position} mean?`
  }

  // Update prompt to default when bids change (only if prompt is empty or matches previous default)
  useEffect(() => {
    if (!questionId && bids.length > 0) {
      const defaultPrompt = generateDefaultPrompt()
      // Only update if prompt is empty or matches a previous default pattern
      if (!prompt || prompt.match(/^What does .+ by [NESW] mean\?$/)) {
        setPrompt(defaultPrompt)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids, questionId])


  const getNextPosition = useCallback((sequence: number): string => {
    const dealers = ['N', 'E', 'S', 'W']
    const positions = ['N', 'E', 'S', 'W']
    const dealerIndex = dealers.indexOf(dealer)
    return positions[(dealerIndex + sequence) % 4]
  }, [dealer])

  const isVulnerable = (position: string): boolean => {
    switch (vulnerability) {
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

  // Get the last contract bid (ignoring pass, double, redouble)
  const getLastContractBid = useCallback((): Bid | null => {
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].bidType === BidType.CONTRACT) {
        return bids[i]
      }
    }
    return null
  }, [bids])

  // Get the last non-pass bid (for double checking)
  const getLastNonPassBid = (): Bid | null => {
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].bidType !== BidType.PASS) {
        return bids[i]
      }
    }
    return null
  }

  // Get contract rank (higher number = higher rank)
  const getContractRank = useCallback((level: number, suit: Suit): number => {
    const suitRanks: Record<Suit, number> = {
      CLUB: 1,
      DIAMOND: 2,
      HEART: 3,
      SPADE: 4,
      NO_TRUMP: 5,
    }
    return level * 10 + suitRanks[suit]
  }, [])

  // Check if a position is an opponent of another position
  const isOpponent = useCallback((pos1: string, pos2: string): boolean => {
    const isNS1 = pos1 === 'N' || pos1 === 'S'
    const isNS2 = pos2 === 'N' || pos2 === 'S'
    return isNS1 !== isNS2
  }, [])

  // Get available levels for contract bids
  const getAvailableLevels = useMemo(() => {
    const lastContractBid = getLastContractBid()
    let minRank = 0
    
    if (lastContractBid) {
      minRank = getContractRank(lastContractBid.level!, lastContractBid.suit!)
    }

    const levels: number[] = []
    for (let level = 1; level <= 7; level++) {
      // Check if any suit at this level would outrank
      for (const suit of suits) {
        const rank = getContractRank(level, suit)
        if (rank > minRank) {
          levels.push(level)
          break
        }
      }
    }
    return levels
  }, [getLastContractBid, getContractRank, suits])

  // Get available suits for a selected level
  const getAvailableSuits = useMemo(() => {
    if (!selectedLevel) return []
    
    const lastContractBid = getLastContractBid()
    let minRank = 0
    
    if (lastContractBid) {
      minRank = getContractRank(lastContractBid.level!, lastContractBid.suit!)
    }

    return suits.filter(suit => {
      const rank = getContractRank(selectedLevel, suit)
      return rank > minRank
    })
  }, [selectedLevel, getLastContractBid, getContractRank, suits])

  // Check if auction has ended
  const isAuctionEnded = useMemo(() => {
    if (bids.length === 0) return false
    
    // Check for 4 passes at start (passed-out hand)
    if (bids.length === 4) {
      const allPasses = bids.every((bid) => bid.bidType === BidType.PASS)
      if (allPasses) return true
    }
    
    // Check for 3 consecutive passes after a contract bid
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
        if (allPasses) return true
      }
    }
    
    return false
  }, [bids])

  // Check if pass is available
  const isPassAvailable = !isAuctionEnded

  // Check if double is available
  const isDoubleAvailable = useMemo(() => {
    if (isAuctionEnded) return false
    
    // Cannot double if there are no bids
    if (bids.length === 0) return false
    
    // Cannot double after a redouble
    const lastBid = bids[bids.length - 1]
    if (lastBid.bidType === BidType.REDOUBLE) return false
    
    // Need a contract bid to double
    const lastContractBid = getLastContractBid()
    if (!lastContractBid) return false
    
    // Can only double opponent's contract bid
    const currentPosition = getNextPosition(bids.length)
    return isOpponent(currentPosition, lastContractBid.position)
  }, [bids, isAuctionEnded, getLastContractBid, getNextPosition, isOpponent])

  // Check if redouble is available
  const isRedoubleAvailable = useMemo(() => {
    if (isAuctionEnded) return false
    if (bids.length === 0) return false
    
    const lastBid = bids[bids.length - 1]
    // Can only redouble after a double (not after a redouble)
    return lastBid.bidType === BidType.DOUBLE
  }, [bids, isAuctionEnded])

  const addBid = (bidType: BidType, level?: number, suit?: Suit) => {
    const newBid: Bid = {
      bidType,
      level,
      suit,
      position: getNextPosition(bids.length),
      sequence: bids.length,
    }
    setBids([...bids, newBid])
    setSelectedLevel(null) // Reset level selection after adding bid
    
    // Reset answer type if current selection is no longer valid
    const updatedBids = [...bids, newBid]
    const lastBid = updatedBids[updatedBids.length - 1]
    if (answerType === AnswerType.DOUBLE_INTERPRETATION && lastBid.bidType !== BidType.DOUBLE) {
      // Switch to a valid default
      if (lastBid.bidType === BidType.CONTRACT || lastBid.bidType === BidType.PASS) {
        setAnswerType(AnswerType.FORCING_NON_FORCING)
        setAnswerOptions([])
      } else {
        setAnswerType(AnswerType.FREE_ANSWER)
        setAnswerOptions([])
      }
    } else if (answerType === AnswerType.FORCING_NON_FORCING && 
               lastBid.bidType !== BidType.CONTRACT && 
               lastBid.bidType !== BidType.PASS) {
      // Switch to a valid default
      setAnswerType(AnswerType.FREE_ANSWER)
      setAnswerOptions([])
    } else if (answerType === AnswerType.DOUBLE_INTERPRETATION && lastBid.bidType === BidType.DOUBLE) {
      // Initialize default options for double interpretation if empty
      if (answerOptions.length === 0) {
        setAnswerOptions(['Penalty', 'Take-out', 'Values'])
      }
    }
  }

  const undoBid = () => {
    if (bids.length > 0) {
      setBids(bids.slice(0, -1))
      setSelectedLevel(null)
    }
  }

  const handleLevelClick = (level: number) => {
    setSelectedLevel(level)
  }

  const handleSuitClick = (suit: Suit) => {
    if (selectedLevel) {
      addBid(BidType.CONTRACT, selectedLevel, suit)
    }
  }

  const handleBidInTableClick = (index: number) => {
    if (bids[index].bidType === BidType.CONTRACT) {
      setEditingAlert(index)
      setAlertMeaning(bids[index].alert?.meaning || '')
    }
  }

  const saveAlert = async (index: number) => {
    if (!alertMeaning.trim()) {
      alert('Alert meaning cannot be empty')
      return
    }

    const newBids = [...bids]
    newBids[index] = {
      ...newBids[index],
      alert: {
        meaning: alertMeaning.trim(),
      },
    }
    setBids(newBids)
    setEditingAlert(null)
    setAlertMeaning('')
  }

  const getBidDisplay = (bid: Bid): string => {
    if (bid.bidType === BidType.CONTRACT) {
      const suitSymbols: Record<Suit, string> = {
        CLUB: '♣',
        DIAMOND: '♦',
        HEART: '♥',
        SPADE: '♠',
        NO_TRUMP: 'NT',
      }
      return `${bid.level}${suitSymbols[bid.suit!]}`
    }
    if (bid.bidType === BidType.PASS) return 'Pass'
    if (bid.bidType === BidType.DOUBLE) return 'X'
    if (bid.bidType === BidType.REDOUBLE) return 'XX'
    return bid.bidType
  }

  // Get bids for each position
  const getBidsForPosition = (position: string): Bid[] => {
    return bids.filter(b => b.position === position)
  }

  const validateAuction = async () => {
    try {
      const response = await fetch('/api/auctions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealer,
          vulnerability,
          bids: bids.map(b => ({
            bidType: b.bidType,
            level: b.level,
            suit: b.suit,
            position: b.position,
            sequence: b.sequence,
          })),
        }),
      })

      const data = await response.json()
      if (!data.valid) {
        setValidationErrors(data.errors?.map((e: any) => e.message) || [])
        return false
      }
      setValidationErrors([])
      return true
    } catch (err) {
      setValidationErrors(['Failed to validate auction'])
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (bids.length === 0) {
      setError('Please add at least one bid to the auction')
      return
    }

    if (!prompt.trim()) {
      setError('Please enter a question prompt')
      return
    }

    // Validate answer options for multiple choice and double interpretation
    if (answerType === AnswerType.MULTIPLE_CHOICE || answerType === AnswerType.DOUBLE_INTERPRETATION) {
      const validOptions = answerOptions.filter(opt => opt.trim().length > 0)
      if (answerType === AnswerType.MULTIPLE_CHOICE && validOptions.length < 2) {
        setError('Multiple choice questions require at least 2 options')
        return
      }
      if (validOptions.length === 0) {
        setError('Please provide at least one answer option')
        return
      }
      // Update answerOptions to only include non-empty options
      setAnswerOptions(validOptions)
    }

    const isValid = await validateAuction()
    if (!isValid) {
      setError('Auction validation failed. Please check the errors below.')
      return
    }

    setLoading(true)

    try {
      const url = questionId ? '/api/questions/update' : '/api/questions/create'
      const method = questionId ? 'PUT' : 'POST'

      // Prepare answer options - only include for MULTIPLE_CHOICE and DOUBLE_INTERPRETATION
      const answerOptionsData = (answerType === AnswerType.MULTIPLE_CHOICE || answerType === AnswerType.DOUBLE_INTERPRETATION)
        ? answerOptions.filter(opt => opt.trim().length > 0)
        : null

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(questionId ? { questionId } : { quizId }),
          auction: {
            dealer,
            vulnerability,
            bids: bids.map(b => ({
              bidType: b.bidType,
              level: b.level,
              suit: b.suit,
              position: b.position,
              sequence: b.sequence,
            })),
          },
          prompt: prompt.trim(),
          answerType,
          ...(answerOptionsData ? { answerOptions: answerOptionsData } : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error - could be string or object with message
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : data.error?.message || data.error || 'Failed to save question'
        setError(errorMessage)
        setLoading(false)
        return
      }

      // Save alerts for contract bids
      if (data.question?.id) {
        for (let i = 0; i < bids.length; i++) {
          if (bids[i].bidType === BidType.CONTRACT && bids[i].alert) {
            const bidId = data.question.auction?.bids?.[i]?.id
            if (bidId) {
              await fetch('/api/alerts/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bidId,
                  meaning: bids[i].alert!.meaning,
                }),
              })
            }
          }
        }
      }

      router.push(`/quizzes/${quizId}/edit`)
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const suitSymbols: Record<Suit, string> = {
    CLUB: '♣',
    DIAMOND: '♦',
    HEART: '♥',
    SPADE: '♠',
    NO_TRUMP: 'NT',
  }

  if (loading && questionId && bids.length === 0 && !prompt) {
    return <div>Loading question...</div>
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '1200px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        {questionId ? 'Edit Question' : 'Create Question'}
      </h2>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        {/* Left: Bridge Table */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Dealer
                </label>
                <select
                  value={dealer}
                  onChange={(e) => {
                    const newDealer = e.target.value as Dealer
                    const oldDealerIndex = positions.indexOf(dealer)
                    const newDealerIndex = positions.indexOf(newDealer)
                    const rotation = (newDealerIndex - oldDealerIndex + 4) % 4
                    
                    // Rotate all bid positions
                    const newBids = bids.map((bid) => {
                      const currentPositionIndex = positions.indexOf(bid.position)
                      const newPositionIndex = (currentPositionIndex + rotation) % 4
                      return {
                        ...bid,
                        position: positions[newPositionIndex],
                      }
                    })
                    
                    setDealer(newDealer)
                    setBids(newBids)
                  }}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  {dealers.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Vulnerability
                </label>
                <select
                  value={vulnerability}
                  onChange={(e) => setVulnerability(e.target.value as Vulnerability)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                >
                  {vulnerabilities.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bridge Table */}
            <div style={{
              position: 'relative',
              width: '400px',
              height: '400px',
              margin: '0 auto',
              border: '3px solid #333',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
            }}>
              {/* North */}
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable('N') ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}>
                N{dealer === Dealer.N && ' (D)'}
              </div>
              
              {/* East */}
              <div style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable('E') ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}>
                E{dealer === Dealer.E && ' (D)'}
              </div>
              
              {/* South */}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable('S') ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}>
                S{dealer === Dealer.S && ' (D)'}
              </div>
              
              {/* West */}
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '80px',
                padding: '0.75rem',
                backgroundColor: isVulnerable('W') ? '#fcc' : '#cfc',
                border: '2px solid #333',
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}>
                W{dealer === Dealer.W && ' (D)'}
              </div>

              {/* Bids displayed around the table */}
              {positions.map((pos) => {
                const positionBids = getBidsForPosition(pos)
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

                return (
                  <div key={pos} style={{ ...positionStyle, display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: pos === 'E' || pos === 'W' ? 'center' : 'center' }}>
                    {positionBids.map((bid, idx) => {
                      const globalIndex = bids.findIndex(b => b === bid)
                      return (
                        <div key={idx} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => handleBidInTableClick(globalIndex)}
                            style={{
                              padding: '0.5rem 1rem',
                              border: bid.alert ? '2px solid #f90' : '1px solid #333',
                              borderRadius: '4px',
                              backgroundColor: '#fff',
                              cursor: bid.bidType === BidType.CONTRACT ? 'pointer' : 'default',
                              fontWeight: bid.alert ? 'bold' : 'normal',
                              fontSize: '0.9rem',
                            }}
                            disabled={bid.bidType !== BidType.CONTRACT}
                          >
                            {getBidDisplay(bid)}
                            {bid.alert && ' ⚠'}
                          </button>
                          {editingAlert === globalIndex && (
                            <div
                              style={{
                                position: 'absolute',
                                top: pos === 'N' ? '100%' : 'auto',
                                bottom: pos === 'S' ? '100%' : 'auto',
                                left: pos === 'W' ? '100%' : pos === 'E' ? 'auto' : '50%',
                                right: pos === 'E' ? '100%' : 'auto',
                                transform: pos === 'N' || pos === 'S' ? 'translateX(-50%)' : 'none',
                                marginTop: pos === 'N' ? '0.5rem' : '0',
                                marginBottom: pos === 'S' ? '0.5rem' : '0',
                                marginLeft: pos === 'W' ? '0.5rem' : '0',
                                marginRight: pos === 'E' ? '0.5rem' : '0',
                                padding: '1rem',
                                backgroundColor: '#fff',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                zIndex: 10,
                                minWidth: '250px',
                              }}
                            >
                              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Alert Meaning
                              </label>
                              <textarea
                                value={alertMeaning}
                                onChange={(e) => setAlertMeaning(e.target.value)}
                                placeholder="Enter alert meaning"
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  marginBottom: '0.5rem',
                                }}
                              />
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={() => saveAlert(globalIndex)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#0070f3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAlert(null)
                                    setAlertMeaning('')
                                  }}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#666',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {bids.length > 0 && (
              <button
                type="button"
                onClick={undoBid}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fee',
                  color: '#c33',
                  border: '1px solid #c33',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'block',
                  margin: '1rem auto 0',
                }}
              >
                Undo Last Bid
              </button>
            )}
          </div>
        </div>

        {/* Right: Bid Selection */}
        <div style={{ width: '300px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Select Bid</h3>
          
          {/* Pass, Double, Redouble - Fixed positions */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isPassAvailable && (
              <button
                type="button"
                onClick={() => addBid(BidType.PASS)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Pass
              </button>
            )}
            {isDoubleAvailable && (
              <button
                type="button"
                onClick={() => addBid(BidType.DOUBLE)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Double (X)
              </button>
            )}
            {isRedoubleAvailable && (
              <button
                type="button"
                onClick={() => addBid(BidType.REDOUBLE)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Redouble (XX)
              </button>
            )}
          </div>

          {/* Contract Bids - Two step selection */}
          <div>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#666' }}>
              Contract Bids
              {isAuctionEnded && <span style={{ color: '#d32f2f', marginLeft: '0.5rem' }}>(Auction Ended)</span>}
            </h4>
            
            {isAuctionEnded ? (
              <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
                The auction has ended. No more bids can be added.
              </div>
            ) : !selectedLevel ? (
              // Step 1: Select Level
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {getAvailableLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleLevelClick(level)}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            ) : (
              // Step 2: Select Suit
              <div>
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '500' }}>Level {selectedLevel} - Choose Suit:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedLevel(null)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                  {getAvailableSuits.map((suit) => (
                    <button
                      key={suit}
                      type="button"
                      onClick={() => handleSuitClick(suit)}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                    >
                      {selectedLevel}{suitSymbols[suit]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px' }}>
          <strong>Validation Errors:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Question Prompt */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="prompt" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Question Prompt *
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          placeholder="Enter the question prompt (this refers to the last bid in the auction)"
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: 'inherit',
          }}
          disabled={loading}
        />
      </div>

      {/* Answer Type */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="answerType" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Answer Type *
        </label>
        <select
          id="answerType"
          value={availableAnswerTypes.includes(answerType) ? answerType : availableAnswerTypes[0] || answerType}
          onChange={(e) => {
            const newAnswerType = e.target.value as AnswerType
            setAnswerType(newAnswerType)
            
            // Initialize answer options based on answer type
            if (newAnswerType === AnswerType.DOUBLE_INTERPRETATION) {
              // If switching to double interpretation and no options exist, use defaults
              if (answerOptions.length === 0) {
                setAnswerOptions(['Penalty', 'Take-out', 'Values'])
              }
            } else if (newAnswerType === AnswerType.MULTIPLE_CHOICE) {
              // If switching to multiple choice and no options exist, initialize with 2 empty options
              if (answerOptions.length === 0) {
                setAnswerOptions(['', ''])
              }
            } else {
              // Clear options for other answer types
              setAnswerOptions([])
            }
          }}
          required
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '1rem',
          }}
          disabled={loading}
        >
          {availableAnswerTypes.map((at) => (
            <option key={at} value={at}>
              {at.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        {bids.length > 0 && !availableAnswerTypes.includes(answerType) && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#c33' }}>
            Current answer type is not valid for the last bid. Please select a valid option.
          </p>
        )}
      </div>

      {/* Answer Options */}
      {(answerType === AnswerType.MULTIPLE_CHOICE || answerType === AnswerType.DOUBLE_INTERPRETATION) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Answer Options *
            {answerType === AnswerType.MULTIPLE_CHOICE && (
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>
                (At least 2 required)
              </span>
            )}
            {answerType === AnswerType.DOUBLE_INTERPRETATION && (
              <span style={{ fontSize: '0.9rem', fontWeight: 'normal', color: '#666', marginLeft: '0.5rem' }}>
                (Default: Penalty, Take-out, Values)
              </span>
            )}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {answerOptions.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...answerOptions]
                    newOptions[index] = e.target.value
                    setAnswerOptions(newOptions)
                  }}
                  placeholder={`Option ${index + 1}`}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newOptions = answerOptions.filter((_, i) => i !== index)
                    setAnswerOptions(newOptions)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                  disabled={loading || (answerType === AnswerType.MULTIPLE_CHOICE && answerOptions.length <= 2)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAnswerOptions([...answerOptions, ''])}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                alignSelf: 'flex-start',
              }}
              disabled={loading}
            >
              + Add Option
            </button>
          </div>
          {answerType === AnswerType.MULTIPLE_CHOICE && answerOptions.length < 2 && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#c33' }}>
              Multiple choice questions require at least 2 options.
            </p>
          )}
        </div>
      )}

      {/* Answer Type Info */}
      {answerType === AnswerType.FORCING_NON_FORCING && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Players will select: <strong>Forcing</strong> or <strong>Non-forcing</strong>
          </p>
        </div>
      )}
      {answerType === AnswerType.FREE_ANSWER && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Players will construct answers using UI buttons with: <strong>Intent</strong> (mandatory), <strong>Suit</strong> (optional), and <strong>Strength/HCP</strong> (optional)
          </p>
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '8px',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving...' : questionId ? 'Update Question' : 'Create Question'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/quizzes/${quizId}/edit`)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
